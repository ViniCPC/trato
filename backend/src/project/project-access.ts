import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { Tx } from '../prisma/prisma.service';

export async function lockProjectForUser(
  prisma: PrismaService,
  tx: Tx,
  projectId: string,
  userId: string,
) {
  const lockQuery = prisma.db.raw.sql`
    SELECT "id"
    FROM "public"."projects"
    WHERE "id" = CAST(${projectId} AS uuid)
    FOR UPDATE
  `
    .returnsRow({
      id: tx.sql.public.projects.columns.id,
    })
    .build();

  await tx.query(lockQuery);

  const project = await tx.orm.public.Project
    .where({ id: projectId })
    .first();

  if (!project) {
    throw new NotFoundException('Projeto não encontrado');
  }

  if (
    project.clientId !== userId &&
    project.freelancerId !== userId
  ) {
    throw new ForbiddenException(
      'Você não participa deste projeto',
    );
  }

  return project;
}