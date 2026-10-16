import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { lockProjectForUser } from './project-access';

@Injectable()
export class ProjectLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async activateProject(projectId: string, userId: string) {
    return this.prisma.db.transaction(async (tx) => {
      const project = await lockProjectForUser(
        this.prisma,
        tx,
        projectId,
        userId,
      );

      if (project.status !== 'draft') {
        throw new ConflictException(
          'Somente projetos em draft podem ser ativados',
        );
      }

      if (project.clientId !== userId) {
        throw new ForbiddenException('Somente o cliente pode ativar o projeto');
      }

      const milestone = await tx.orm.public.Milestone.where({ projectId })
        .select('id')
        .first();

      if (!milestone) {
        throw new BadRequestException(
          'O projeto precisa ter pelo menos uma etapa para ser ativado',
        );
      }

      const updated = await tx.orm.public.Project.where({
        id: projectId,
        status: 'draft',
      }).update({
        status: 'active',
      });

      if (!updated) {
        throw new NotFoundException('Projeto não encontrado');
      }

      return updated;
    });
  }

  async cancelProject(projectId: string, userId: string) {
    return this.prisma.db.transaction(async (tx) => {
      const project = await lockProjectForUser(
        this.prisma,
        tx,
        projectId,
        userId,
      );

      if (project.status === 'cancelled') {
        return project;
      }

      if (project.clientId !== userId) {
        throw new ForbiddenException(
          'Somente o cliente pode cancelar o projeto',
        );
      }

      if (project.status !== 'draft' && project.status !== 'active') {
        throw new ConflictException(
          'Somente projetos em draft ou active podem ser cancelados',
        );
      }

      const processedMilestone = await tx.orm.public.Milestone.where({
        projectId,
      })
        .where((m) => m.status.neq('pending'))
        .select('id')
        .first();

      if (processedMilestone) {
        throw new ConflictException(
          'O cancelamento direto exige todas as etapas em pending. ' +
            'Etapas já processadas exigem o fluxo de reembolso ou encerramento',
        );
      }

      const updated = await tx.orm.public.Project.where({
        id: projectId,
        status: project.status,
      }).update({
        status: 'cancelled',
      });

      if (!updated) {
        throw new NotFoundException('Projeto não encontrado');
      }

      return updated;
    });
  }
}
