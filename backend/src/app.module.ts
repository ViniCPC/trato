import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { ProjectLifecycleModule } from './project/project-lifecycle.module';
import { MilestoneModule } from './milestones/milestone.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { validateEnvironment } from './config/environment';
import { DevFaucetModule } from './dev-faucet/dev-faucet.module';
import { LedgerModule } from './ledger/ledger.module';
import { WithdrawalModule } from './withdrawals/withdrawal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    AuthModule,
    ProjectModule,
    ProjectLifecycleModule,
    MilestoneModule,
    LedgerModule,
    WithdrawalModule,
    ...(process.env.NODE_ENV === 'production' ? [] : [DevFaucetModule]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ transform: true, whitelist: true }),
    },
  ],
})
export class AppModule {}
