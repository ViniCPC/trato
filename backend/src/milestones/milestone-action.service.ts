import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import {
  ESCROW_PROVIDER,
  type EscrowAction,
  type EscrowContext,
  type EscrowProvider,
} from './escrow.provider';
import {
  type MilestoneStatus,
  MilestoneTransitionError,
  transitionMilestone,
} from './milestone-state-machine';

const ACTION_STATUS: Record<EscrowAction, MilestoneStatus> = {
  fund: 'funded',
  submit: 'submitted',
  release: 'released',
  refund: 'refunded',
};

interface ActionRecord {
  milestone: {
    id: string;
    projectId: string;
    amountBaseUnits: bigint;
    status: MilestoneStatus;
    escrowAddress: string | null;
    fundTxSignature: string | null;
    submitTxSignature: string | null;
    releaseTxSignature: string | null;
    refundTxSignature: string | null;
  };
  project: {
    id: string;
    status: string;
    clientId: string;
    freelancerId: string;
  };
  context: EscrowContext;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'sqlState' in error &&
    error.sqlState === '23505'
  );
}

@Injectable()
export class MilestoneActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(ESCROW_PROVIDER) private readonly escrow: EscrowProvider,
  ) {}

  async prepare(milestoneId: string, userId: string, action: EscrowAction) {
    const record = await this.loadActionRecord(milestoneId, userId);
    this.assertTransition(record, userId, action);
    return this.escrow.prepare(action, record.context);
  }

  async confirm(
    milestoneId: string,
    userId: string,
    action: EscrowAction,
    signature: string,
  ) {
    const initial = await this.loadActionRecord(milestoneId, userId, true);
    if (
      initial.milestone.status === ACTION_STATUS[action] &&
      this.getSignature(initial.milestone, action) === signature
    ) {
      return this.serialize(initial.milestone, signature);
    }
    if (initial.project.status !== 'active') {
      throw new ConflictException('O projeto precisa estar active');
    }

    const nextStatus = this.assertTransition(initial, userId, action);
    const result = await this.escrow.confirm(
      action,
      signature,
      initial.context,
    );
    if (result.status !== nextStatus) {
      throw new ConflictException('O escrow retornou um status inesperado');
    }

    try {
      return await this.prisma.db.transaction(async (tx) => {
        const duplicate = await tx.orm.public.EscrowConfirmation.where({
          signature,
        }).first();
        if (
          duplicate &&
          (duplicate.milestoneId !== milestoneId || duplicate.action !== action)
        ) {
          throw new ConflictException(
            'Esta assinatura já confirmou outra etapa',
          );
        }

        const now = new Date().toISOString();
        const actionFields = {
          fund: {
            fundTxSignature: signature,
            fundedAt: now,
            escrowAddress: result.escrowAddress,
          },
          submit: { submitTxSignature: signature, submittedAt: now },
          release: { releaseTxSignature: signature, releasedAt: now },
          refund: { refundTxSignature: signature },
        }[action];

        const updated = await tx.orm.public.Milestone.where({
          id: milestoneId,
          status: initial.milestone.status,
        }).update({ status: nextStatus, ...actionFields });

        if (!updated) {
          const latest = await tx.orm.public.Milestone.where({
            id: milestoneId,
          }).first();
          if (latest && this.getSignature(latest, action) === signature) {
            return this.serialize(latest, signature);
          }
          throw new ConflictException(
            'A etapa foi alterada durante a confirmação',
          );
        }

        if (!duplicate) {
          await tx.orm.public.EscrowConfirmation.create({
            milestoneId,
            action,
            signature,
          });
        }

        if (action === 'release') {
          const remaining = await tx.orm.public.Milestone.where({
            projectId: initial.project.id,
          })
            .where((milestone) => milestone.status.neq('released'))
            .select('id')
            .first();
          if (!remaining) {
            await tx.orm.public.Project.where({
              id: initial.project.id,
              status: 'active',
            }).update({ status: 'completed' });
          }
        }

        return this.serialize(updated, signature);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Esta assinatura já foi utilizada');
      }
      throw error;
    }
  }

  private async loadActionRecord(
    milestoneId: string,
    userId: string,
    allowInactive = false,
  ): Promise<ActionRecord> {
    const milestone = await this.prisma.orm.public.Milestone.where({
      id: milestoneId,
    }).first();
    if (!milestone) throw new NotFoundException('Etapa não encontrada');

    const project = await this.prisma.orm.public.Project.where({
      id: milestone.projectId,
    }).first();
    if (!project) throw new NotFoundException('Projeto não encontrado');
    if (project.clientId !== userId && project.freelancerId !== userId) {
      throw new ForbiddenException('Você não participa deste projeto');
    }
    if (!allowInactive && project.status !== 'active') {
      throw new ConflictException('O projeto precisa estar active');
    }

    const [client, freelancer, actor] = await Promise.all([
      this.prisma.orm.public.User.where({ id: project.clientId }).first(),
      this.prisma.orm.public.User.where({ id: project.freelancerId }).first(),
      this.prisma.orm.public.User.where({ id: userId }).first(),
    ]);
    const requiresWallet = this.config.get('ESCROW_DRIVER') === 'solana';
    if (
      requiresWallet &&
      (!client?.walletAddress || !freelancer?.walletAddress)
    ) {
      throw new ConflictException(
        'Cliente e freelancer precisam vincular suas carteiras antes da ação',
      );
    }
    if (requiresWallet && !actor?.walletAddress) {
      throw new ConflictException('Vincule sua carteira antes de continuar');
    }

    return {
      milestone,
      project,
      context: {
        milestoneId,
        projectId: project.id,
        amountBaseUnits: milestone.amountBaseUnits,
        escrowAddress: milestone.escrowAddress,
        clientWallet:
          client?.walletAddress ?? '11111111111111111111111111111111',
        freelancerWallet:
          freelancer?.walletAddress ?? '11111111111111111111111111111111',
        actorWallet: actor?.walletAddress ?? '11111111111111111111111111111111',
      },
    };
  }

  private assertTransition(
    record: ActionRecord,
    userId: string,
    action: EscrowAction,
  ): MilestoneStatus {
    try {
      return transitionMilestone({
        currentStatus: record.milestone.status,
        nextStatus: ACTION_STATUS[action],
        userId,
        project: record.project,
      });
    } catch (error) {
      if (error instanceof MilestoneTransitionError) {
        if (error.code === 'FORBIDDEN_ACTOR') {
          throw new ForbiddenException(error.message);
        }
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  private getSignature(
    milestone: {
      fundTxSignature: string | null;
      submitTxSignature: string | null;
      releaseTxSignature: string | null;
      refundTxSignature: string | null;
    },
    action: EscrowAction,
  ): string | null {
    return {
      fund: milestone.fundTxSignature,
      submit: milestone.submitTxSignature,
      release: milestone.releaseTxSignature,
      refund: milestone.refundTxSignature,
    }[action];
  }

  private serialize<T extends { amountBaseUnits: bigint }>(
    milestone: T,
    signature: string,
  ) {
    return {
      ...milestone,
      amountBaseUnits: milestone.amountBaseUnits.toString(),
      signature,
    };
  }
}
