import argon2 from 'argon2';

import { LedgerService } from '../ledger/ledger.service';
import { db } from './db';
import type { PrismaService, Tx } from './prisma.service';

const DEMO_PASSWORD = 'trato123';
const ledger = new LedgerService({ db } as PrismaService);

interface SeedUser {
  email: string;
  name: string;
}

interface SeedMilestone {
  sequence: number;
  title: string;
  amountBaseUnits: bigint;
  status: 'pending' | 'funded' | 'submitted' | 'released' | 'refunded';
}

interface SeedProject {
  title: string;
  description: string;
  clientId: string;
  freelancerId: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  milestones: SeedMilestone[];
}

async function upsertUser(user: SeedUser, passwordHash: string) {
  const existing = await db.orm.public.User.where({
    email: user.email,
  }).first();

  if (existing) {
    return db.orm.public.User.where({ id: existing.id }).update({
      name: user.name,
      passwordHash,
    });
  }

  return db.orm.public.User.create({ ...user, passwordHash });
}

async function upsertProject(project: SeedProject): Promise<void> {
  const existing = await db.orm.public.Project.where({
    title: project.title,
    clientId: project.clientId,
    freelancerId: project.freelancerId,
  }).first();

  const savedProject = existing
    ? await db.orm.public.Project.where({ id: existing.id }).update({
        description: project.description,
        status: project.status,
      })
    : await db.orm.public.Project.create({
        title: project.title,
        description: project.description,
        clientId: project.clientId,
        freelancerId: project.freelancerId,
        status: project.status,
      });

  if (!savedProject) {
    throw new Error(`Não foi possível criar o projeto ${project.title}.`);
  }

  for (const milestone of project.milestones) {
    await db.transaction(async (tx) => {
      const current = await tx.orm.public.Milestone.where({
        projectId: savedProject.id,
        sequence: milestone.sequence,
      }).first();

      const savedMilestone = current
        ? await tx.orm.public.Milestone.where({ id: current.id }).update({
            title: milestone.title,
            amountBaseUnits: milestone.amountBaseUnits,
            status: milestone.status,
          })
        : await tx.orm.public.Milestone.create({
            projectId: savedProject.id,
            sequence: milestone.sequence,
            title: milestone.title,
            amountBaseUnits: milestone.amountBaseUnits,
            status: milestone.status,
          });

      if (!savedMilestone) {
        throw new Error(`Não foi possível criar a etapa ${milestone.title}.`);
      }
      await postSeedLedger(tx, project, savedMilestone);
    });
  }
}

async function postSeedLedger(
  tx: Tx,
  project: Pick<SeedProject, 'clientId' | 'freelancerId'>,
  milestone: { id: string; amountBaseUnits: bigint; status: string },
): Promise<void> {
  if (milestone.status === 'pending') return;

  await ledger.milestoneFunded(tx, {
    milestoneId: milestone.id,
    clientId: project.clientId,
    amountBaseUnits: milestone.amountBaseUnits,
  });
  if (milestone.status === 'released') {
    await ledger.milestoneReleased(tx, {
      milestoneId: milestone.id,
      freelancerId: project.freelancerId,
      amountBaseUnits: milestone.amountBaseUnits,
    });
  } else if (milestone.status === 'refunded') {
    await ledger.milestoneRefunded(tx, {
      milestoneId: milestone.id,
      clientId: project.clientId,
      amountBaseUnits: milestone.amountBaseUnits,
    });
  }
}

async function seed(): Promise<void> {
  await db.connect();
  const passwordHash = await argon2.hash(DEMO_PASSWORD);
  const client = await upsertUser(
    { name: 'Marina Costa', email: 'cliente@trato.dev' },
    passwordHash,
  );
  const freelancer = await upsertUser(
    { name: 'Caio Mendes', email: 'freelancer@trato.dev' },
    passwordHash,
  );

  if (!client || !freelancer) {
    throw new Error('Não foi possível preparar os usuários de demonstração.');
  }

  await upsertProject({
    title: 'Identidade visual da Aurora',
    description: 'Estratégia, identidade e kit de lançamento da marca.',
    clientId: client.id,
    freelancerId: freelancer.id,
    status: 'active',
    milestones: [
      {
        sequence: 1,
        title: 'Direção criativa',
        amountBaseUnits: 1_500_000_000n,
        status: 'released',
      },
      {
        sequence: 2,
        title: 'Sistema visual',
        amountBaseUnits: 2_500_000_000n,
        status: 'released',
      },
      {
        sequence: 3,
        title: 'Aplicações da marca',
        amountBaseUnits: 1_800_000_000n,
        status: 'submitted',
      },
      {
        sequence: 4,
        title: 'Kit de lançamento',
        amountBaseUnits: 1_200_000_000n,
        status: 'funded',
      },
    ],
  });

  await upsertProject({
    title: 'Landing page de captação',
    description: 'Página responsiva para a campanha do novo produto.',
    clientId: client.id,
    freelancerId: freelancer.id,
    status: 'draft',
    milestones: [
      {
        sequence: 1,
        title: 'Wireframe e conteúdo',
        amountBaseUnits: 900_000_000n,
        status: 'pending',
      },
      {
        sequence: 2,
        title: 'Design e desenvolvimento',
        amountBaseUnits: 2_100_000_000n,
        status: 'pending',
      },
    ],
  });

  await upsertProject({
    title: 'Pesquisa com clientes',
    description: 'Entrevistas e síntese de oportunidades para o produto.',
    clientId: freelancer.id,
    freelancerId: client.id,
    status: 'active',
    milestones: [
      {
        sequence: 1,
        title: 'Roteiro e recrutamento',
        amountBaseUnits: 800_000_000n,
        status: 'released',
      },
      {
        sequence: 2,
        title: 'Entrevistas',
        amountBaseUnits: 1_600_000_000n,
        status: 'funded',
      },
      {
        sequence: 3,
        title: 'Relatório final',
        amountBaseUnits: 1_100_000_000n,
        status: 'pending',
      },
    ],
  });
}

seed()
  .then(() => {
    console.log(
      'Seed concluído. Use cliente@trato.dev ou freelancer@trato.dev.',
    );
  })
  .catch((error: unknown) => {
    console.error('Falha ao executar o seed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
