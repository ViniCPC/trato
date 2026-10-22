import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

export type Tx = Parameters<
  Parameters<PrismaService['db']['transaction']>[0]
>[0];

@Injectable()
export class MilestoneService {
  constructor(private readonly prisma: PrismaService) {}

  async createMilestone(
    projectId: string,
    userId: string,
    dto: CreateMilestoneDto,
  ) {
    const amountBaseUnits = this.parseAmount(dto.amountBaseUnits);

    return this.withDraftProject(projectId, userId, async (tx) => {
      const lastMilestone = await tx.orm.public.Milestone.where({ projectId })
        .select('sequence')
        .orderBy((m) => m.sequence.desc())
        .first();

      const sequence = (lastMilestone?.sequence ?? 0) + 1;

      if (sequence > 2_147_483_647) {
        throw new ConflictException('Limite de sequência atingido');
      }

      const milestone = await tx.orm.public.Milestone.create({
        projectId,
        sequence,
        title: dto.title.trim(),
        description: dto.description ?? null,
        amountBaseUnits,
      });

      return this.toResponse(milestone);
    });
  }

  async findAllMilestones(projectId: string, userId: string) {
    return this.withDraftProject(projectId, userId, async (tx) => {
      const milestones = await tx.orm.public.Milestone.where({ projectId })
        .orderBy((m) => m.sequence.asc())
        .all();

      return milestones.map((milestone) => this.toResponse(milestone));
    });
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    userId: string,
    dto: UpdateMilestoneDto,
  ) {
    const data = {
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.description !== undefined && {
        description: dto.description,
      }),
      ...(dto.amountBaseUnits !== undefined && {
        amountBaseUnits: this.parseAmount(dto.amountBaseUnits),
      }),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Informe pelo menos um campo para atualizar',
      );
    }

    return this.withDraftProject(projectId, userId, async (tx) => {
      const milestone = await tx.orm.public.Milestone.where({
        id: milestoneId,
        projectId,
      }).update(data);

      if (!milestone) {
        throw new NotFoundException('Etapa não encontrada neste projeto');
      }

      return this.toResponse(milestone);
    });
  }

  async deleteMilestone(
    projectId: string,
    milestoneId: string,
    userId: string,
  ) {
    return this.withDraftProject(projectId, userId, async (tx) => {
      const milestone = await tx.orm.public.Milestone.where({
        id: milestoneId,
        projectId,
      }).delete();

      if (!milestone) {
        throw new NotFoundException('Etapa não encontrada neste projeto');
      }
    });
  }

  private async withDraftProject<T>(
    projectId: string,
    userId: string,
    run: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    return this.prisma.db.transaction(async (tx) => {
      // A trava dura até o fim da transação. Todas as operações deste
      // service travam o mesmo projeto antes de consultar suas etapas.
      const lockQuery = this.prisma.db.raw.sql`
        SELECT "id"
        FROM "public"."projects"
        WHERE "id" = CAST(${projectId} AS uuid)
        FOR UPDATE
      `
        .returnsRow({ id: tx.sql.public.projects.columns.id })
        .build();

      await tx.query(lockQuery);

      const project = await tx.orm.public.Project.where({
        id: projectId,
      }).first();

      if (!project) {
        throw new NotFoundException('Projeto não encontrado');
      }

      if (project.clientId !== userId && project.freelancerId !== userId) {
        throw new ForbiddenException('Você não participa deste projeto');
      }

      if (project.status !== 'draft') {
        throw new ConflictException(
          'Esta operação exige que o projeto esteja em draft',
        );
      }

      return run(tx);
    });
  }

  private parseAmount(value: string): bigint {
    if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value)) {
      throw new BadRequestException(
        'amountBaseUnits deve ser um inteiro positivo enviado como string',
      );
    }

    const amount = BigInt(value);

    if (amount > BigInt('9223372036854775807')) {
      throw new BadRequestException(
        'amountBaseUnits excede o limite do BigInt do PostgreSQL',
      );
    }

    return amount;
  }

  private toResponse<T extends { amountBaseUnits: bigint }>(milestone: T) {
    const { amountBaseUnits, ...fields } = milestone;

    return {
      ...fields,
      amountBaseUnits: amountBaseUnits.toString(),
    };
  }
}
