import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { EscrowProvider } from '../src/milestones/escrow.provider';
import { MilestoneActionService } from '../src/milestones/milestone-action.service';
import { MilestoneController } from '../src/milestones/milestone.controller';
import { MilestoneService } from '../src/milestones/milestone.service';
import { MockEscrowProvider } from '../src/milestones/mock-escrow.provider';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('../src/prisma/db', () => ({ db: {} }));
jest.mock('../src/auth/jwt-auth.guard', () => ({ JwtAuthGuard: class {} }));
jest.mock('../src/milestones/milestone.service', () => ({
  MilestoneService: class {},
}));

const clientId = '11111111-1111-4111-8111-111111111111';
const freelancerId = '22222222-2222-4222-8222-222222222222';
const projectId = '33333333-3333-4333-8333-333333333333';
const firstId = '44444444-4444-4444-8444-444444444444';
const secondId = '55555555-5555-4555-8555-555555555555';

type RecordRow = Record<string, any>;

function createMemoryPrisma(milestoneIds: string[]) {
  const project: RecordRow = {
    id: projectId,
    clientId,
    freelancerId,
    status: 'active',
  };
  const milestones: RecordRow[] = milestoneIds.map((id) => ({
    id,
    projectId,
    status: 'pending',
    amountBaseUnits: 100n,
    escrowAddress: null,
    fundTxSignature: null,
    releaseTxSignature: null,
    refundTxSignature: null,
  }));

  function query(
    rows: RecordRow[],
    conditions: RecordRow = {},
    excludedStatus?: string,
  ) {
    const matching = () =>
      rows.find(
        (row) =>
          Object.entries(conditions).every(
            ([key, value]) => row[key] === value,
          ) &&
          (!excludedStatus || row.status !== excludedStatus),
      );

    return {
      where(filter: RecordRow | ((fields: any) => void)) {
        if (typeof filter === 'function') {
          filter({
            status: {
              neq: (status: string) => {
                excludedStatus = status;
              },
            },
          });
        } else {
          Object.assign(conditions, filter);
        }
        return this;
      },
      select() {
        return this;
      },
      async first() {
        return matching() ?? null;
      },
      async update(data: RecordRow) {
        const row = matching();
        if (!row) return null;
        Object.assign(row, data);
        return { ...row };
      },
    };
  }

  const tx = {
    query: async () => [],
    sql: { public: { projects: { columns: { id: {} } } } },
    orm: {
      public: {
        Project: { where: (filter: RecordRow) => query([project], filter) },
        Milestone: { where: (filter: RecordRow) => query(milestones, filter) },
      },
    },
  };
  const prisma = {
    db: {
      raw: { sql: () => ({ returnsRow: () => ({ build: () => ({}) }) }) },
      transaction: async (run: (transaction: typeof tx) => Promise<unknown>) =>
        run(tx),
    },
  };

  return { prisma, project, milestones };
}

describe('Milestone actions (e2e)', () => {
  let app: INestApplication;
  let store: ReturnType<typeof createMemoryPrisma>;

  async function start(milestoneIds: string[]) {
    store = createMemoryPrisma(milestoneIds);
    const moduleRef = await Test.createTestingModule({
      controllers: [MilestoneController],
      providers: [
        MilestoneActionService,
        { provide: MilestoneService, useValue: {} },
        { provide: EscrowProvider, useClass: MockEscrowProvider },
        { provide: PrismaService, useValue: store.prisma },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const httpRequest = context.switchToHttp().getRequest();
          httpRequest.user = { id: httpRequest.headers['x-user-id'] };
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }

  function action(milestoneId: string, name: string, userId: string) {
    return request(app.getHttpServer())
      .post(`/projects/${projectId}/milestones/${milestoneId}/${name}`)
      .set('x-user-id', userId);
  }

  afterEach(async () => {
    if (app) await app.close();
  });

  it('financia, entrega e libera uma etapa, concluindo o projeto', async () => {
    await start([firstId]);

    const forbidden = await action(firstId, 'fund', freelancerId).expect(403);
    expect(forbidden.body).toMatchObject({ statusCode: 403 });
    expect(store.milestones[0].status).toBe('pending');

    const funded = await action(firstId, 'fund', clientId).expect(200);
    expect(funded.body).toMatchObject({
      status: 'funded',
      amountBaseUnits: '100',
    });
    expect(funded.body.signature).toMatch(/^mock_/);
    expect(store.milestones[0].fundTxSignature).toBe(funded.body.signature);

    const submitted = await action(firstId, 'submit', freelancerId).expect(200);
    expect(submitted.body.status).toBe('submitted');
    expect(submitted.body.signature).toMatch(/^mock_/);

    const released = await action(firstId, 'release', clientId).expect(200);
    expect(released.body.status).toBe('released');
    expect(store.milestones[0].releaseTxSignature).toBe(
      released.body.signature,
    );
    expect(store.project.status).toBe('completed');
  });

  it('conclui o projeto somente após liberar todas as etapas', async () => {
    await start([firstId, secondId]);

    await action(firstId, 'fund', clientId).expect(200);
    await action(firstId, 'submit', freelancerId).expect(200);
    await action(firstId, 'release', clientId).expect(200);
    expect(store.project.status).toBe('active');

    await action(secondId, 'fund', clientId).expect(200);
    await action(secondId, 'submit', freelancerId).expect(200);
    await action(secondId, 'release', clientId).expect(200);
    expect(store.project.status).toBe('completed');
  });

  it('reembolsa uma etapa financiada e conserva o projeto ativo', async () => {
    await start([firstId]);

    await action(firstId, 'fund', clientId).expect(200);
    const refunded = await action(firstId, 'refund', clientId).expect(200);
    expect(refunded.body.status).toBe('refunded');
    expect(store.milestones[0].refundTxSignature).toBe(refunded.body.signature);
    expect(store.project.status).toBe('active');

    const repeated = await action(firstId, 'refund', clientId).expect(409);
    expect(repeated.body).toMatchObject({ statusCode: 409 });
  });
});
