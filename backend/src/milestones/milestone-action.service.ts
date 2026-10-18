import {
  ConflictException,
  HttpException,
  HttpStatus,
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
  claim: 'released',
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
  private readonly syncAttempts = new Map<string, number[]>();
  private readonly lastSyncByMilestone = new Map<string, number>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(ESCROW_PROVIDER) private readonly escrow: EscrowProvider,
  ) {}

  getRules() {
    return this.escrow.getRules();
  }

  async prepare(milestoneId: string, userId: string, action: EscrowAction) {
    const record = await this.loadActionRecord(milestoneId, userId);
    this.assertTransition(record, userId, action);
    return this.escrow.prepare(action, record.context);
  }

  async sync(milestoneId: string, userId: string) {
    const record = await this.loadActionRecord(milestoneId, userId, true);
    if (
      record.milestone.status !== 'funded' &&
      record.milestone.status !== 'submitted'
    ) {
      return this.toResponse(record.milestone);
    }
    this.assertSyncRateLimit(userId, milestoneId);
    const found = await this.escrow.findUnconfirmedAction(
      record.context,
      record.milestone.status,
    );
    if (!found) return this.toResponse(record.milestone);
    const actorId =
      found.action === 'submit'
        ? record.project.freelancerId
        : found.action === 'claim'
          ? record.project.freelancerId
          : record.project.clientId;
    return this.confirm(milestoneId, actorId, found.action, found.signature);
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
          claim: { releaseTxSignature: signature, releasedAt: now },
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

        if (action === 'release' || action === 'claim') {
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
        action: action === 'claim' ? 'claim' : undefined,
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
      claim: milestone.releaseTxSignature,
    }[action];
  }

  private serialize<T extends { amountBaseUnits: bigint }>(
    milestone: T,
    signature: string,
  ) {
    return {
      ...this.toResponse(milestone),
      signature,
    };
  }

  private toResponse<T extends { amountBaseUnits: bigint }>(milestone: T) {
    return {
      ...milestone,
      amountBaseUnits: milestone.amountBaseUnits.toString(),
    };
  }

  private assertSyncRateLimit(userId: string, milestoneId: string): void {
    const now = Date.now();
    const attempts = (this.syncAttempts.get(userId) ?? []).filter(
      (time) => now - time < 60_000,
    );
    const key = `${userId}:${milestoneId}`;
    const lastSync = this.lastSyncByMilestone.get(key) ?? 0;
    if (attempts.length >= 20 || now - lastSync < 30_000) {
      throw new HttpException(
        'Sincronização solicitada recentemente; tente novamente em instantes',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    attempts.push(now);
    this.syncAttempts.set(userId, attempts);
    this.lastSyncByMilestone.set(key, now);
    if (this.lastSyncByMilestone.size > 10_000) {
      for (const [entry, time] of this.lastSyncByMilestone) {
        if (now - time >= 30_000) this.lastSyncByMilestone.delete(entry);
      }
    }
  }
}
