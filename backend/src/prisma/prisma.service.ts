import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { db } from './db';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  get db() {
    return db;
  }

  get orm() {
    return db.orm;
  }

  get sql() {
    return db.sql;
  }

  async onModuleInit() {
    await db.connect();
  }

  async onModuleDestroy() {
    await db.close();
  }
}
