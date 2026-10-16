import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  ListProjectsQueryDto,
  ProjectRole,
} from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { lockProjectForUser } from './project-access';

const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n;

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'sqlState' in error &&
    error.sqlState === '23503'
  );
}

function parseAmount(value: string): bigint {
  if (!/^[1-9]\d{0,18}$/.test(value)) {
    throw new BadRequestException(
      'amountBaseUnits deve ser um inteiro positivo enviado como string',
    );
  }

  const amount = BigInt(value);
  if (amount > POSTGRES_BIGINT_MAX) {
    throw new BadRequestException(
      'amountBaseUnits excede o limite do BigInt do PostgreSQL',
    );
  }

  return amount;
}

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(clientId: string, dto: CreateProjectDto) {
    return this.prisma.db.transaction(async (tx) => {
      const client = await tx.orm.public.User.where({ id: clientId })
        .select('id', 'name', 'email')
        .first();
      const freelancer = await tx.orm.public.User.where({
        email: dto.freelancerEmail,
      })
        .select('id', 'name', 'email')
        .first();

      if (!client) {
        throw new ForbiddenException('Cliente autenticado não encontrado');
      }

      if (!freelancer) {
        throw new BadRequestException(
          'Não encontramos uma conta com o e-mail do freelancer',
        );
      }

      if (freelancer.id === client.id) {
        throw new BadRequestException(
          'O cliente e o freelancer precisam ser pessoas diferentes',
        );
      }

      const milestones = dto.milestones.map((milestone, index) => ({
        sequence: index + 1,
        title: milestone.title,
        description: milestone.description || null,
        amountBaseUnits: parseAmount(milestone.amountBaseUnits),
      }));

      const project = await tx.orm.public.Project.create({
        title: dto.title,
        description: dto.description || null,
        clientId: client.id,
        freelancerId: freelancer.id,
      });

      for (const milestone of milestones) {
        await tx.orm.public.Milestone.create({
          projectId: project.id,
          ...milestone,
        });
      }

      return {
        id: project.id,
        status: project.status,
        totalAmountBaseUnits: milestones
          .reduce((total, milestone) => total + milestone.amountBaseUnits, 0n)
          .toString(),
      };
    });
  }

  async findAllProjects(userId: string, query: ListProjectsQueryDto) {
    const { role, limit, offset } = query;
    const projects = await this.prisma.orm.public.Project.where((project) =>
      role === 'client'
        ? project.clientId.eq(userId)
        : project.freelancerId.eq(userId),
    )
      .include('client', (client) => client.select('id', 'name'))
      .include('freelancer', (freelancer) => freelancer.select('id', 'name'))
      .include('milestones', (milestones) =>
        milestones.combine({
          total: milestones.count(),
          released: milestones
            .where((milestone) => milestone.status.eq('released'))
            .count(),
          totalAmountBaseUnits: milestones.sumBigInt('amountBaseUnits'),
        }),
      )
      .orderBy([
        (project) => project.createdAt.desc(),
        (project) => project.id.desc(),
      ])
      .offset(offset)
      .limit(limit + 1)
      .all();

    const hasMore = projects.length > limit;
    const items = projects
      .slice(0, limit)
      .map((project) => this.toListItem(project, role));

    return { items, hasMore, limit, offset };
  }

  async findProjectById(id: string, userId: string) {
    const project = await this.prisma.orm.public.Project.where({ id })
      .include('client', (client) => client.select('id', 'name', 'email'))
      .include('freelancer', (freelancer) =>
        freelancer.select('id', 'name', 'email'),
      )
      .include('milestones', (milestones) =>
        milestones.orderBy((milestone) => milestone.sequence.asc()),
      )
      .first();

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    const role = this.getRole(project, userId);
    const { milestones, ...fields } = project;
    const serializedMilestones = milestones.map((milestone) => ({
      ...milestone,
      amountBaseUnits: milestone.amountBaseUnits.toString(),
    }));

    return {
      ...fields,
      role,
      milestones: serializedMilestones,
      summary: {
        totalMilestones: serializedMilestones.length,
        releasedMilestones: serializedMilestones.filter(
          (milestone) => milestone.status === 'released',
        ).length,
        totalAmountBaseUnits: milestones
          .reduce((total, milestone) => total + milestone.amountBaseUnits, 0n)
          .toString(),
      },
    };
  }

  async updateProject(id: string, userId: string, dto: UpdateProjectDto) {
    const data = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && {
        description: dto.description,
      }),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Informe pelo menos um campo para atualizar',
      );
    }

    return this.prisma.db.transaction(async (tx) => {
      const project = await lockProjectForUser(this.prisma, tx, id, userId);
      this.assertDraftClient(project, userId);

      const updated = await tx.orm.public.Project.where({ id }).update(data);
      if (!updated) {
        throw new NotFoundException('Projeto não encontrado');
      }

      return updated;
    });
  }

  async deleteProject(id: string, userId: string) {
    try {
      return await this.prisma.db.transaction(async (tx) => {
        const project = await lockProjectForUser(this.prisma, tx, id, userId);
        this.assertDraftClient(project, userId);

        const deleted = await tx.orm.public.Project.where({ id }).delete();
        if (!deleted) {
          throw new NotFoundException('Projeto não encontrado');
        }

        return deleted;
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'O projeto possui registros vinculados que impedem a exclusão',
        );
      }

      throw error;
    }
  }

  private toListItem<
    T extends {
      client: { id: string; name: string } | null;
      freelancer: { id: string; name: string } | null;
      milestones: {
        total: number;
        released: number;
        totalAmountBaseUnits: bigint | null;
      };
    },
  >(project: T, role: ProjectRole) {
    const { client, freelancer, milestones, ...fields } = project;
    const otherParty = role === 'client' ? freelancer : client;

    if (!otherParty) {
      throw new NotFoundException('Participante do projeto não encontrado');
    }

    return {
      ...fields,
      role,
      otherParty,
      summary: {
        totalMilestones: milestones.total,
        releasedMilestones: milestones.released,
        totalAmountBaseUnits: (
          milestones.totalAmountBaseUnits ?? 0n
        ).toString(),
      },
    };
  }

  private getRole(
    project: { clientId: string; freelancerId: string },
    userId: string,
  ): ProjectRole {
    if (project.clientId === userId) {
      return 'client';
    }

    if (project.freelancerId === userId) {
      return 'freelancer';
    }

    throw new ForbiddenException('Você não participa deste projeto');
  }

  private assertDraftClient(
    project: { clientId: string; status: string },
    userId: string,
  ): void {
    if (project.clientId !== userId) {
      throw new ForbiddenException('Somente o cliente pode editar o projeto');
    }

    if (project.status !== 'draft') {
      throw new ConflictException(
        'Somente projetos em rascunho podem ser alterados',
      );
    }
  }
}
