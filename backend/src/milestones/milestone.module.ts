import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MilestoneController } from './milestone.controller';
import { EscrowActionController } from './escrow-action.controller';
import { EscrowRulesController } from './escrow-rules.controller';
import { ESCROW_PROVIDER, type EscrowProvider } from './escrow.provider';
import { MilestoneActionService } from './milestone-action.service';
import { MilestoneService } from './milestone.service';
import { MockEscrowProvider } from './mock-escrow.provider';
import { SolanaEscrowProvider } from './solana-escrow.provider';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    MilestoneController,
    EscrowActionController,
    EscrowRulesController,
  ],
  providers: [
    MilestoneService,
    MilestoneActionService,
    MockEscrowProvider,
    SolanaEscrowProvider,
    {
      provide: ESCROW_PROVIDER,
      inject: [ConfigService, MockEscrowProvider, SolanaEscrowProvider],
      useFactory: (
        config: ConfigService,
        mock: MockEscrowProvider,
        solana: SolanaEscrowProvider,
      ): EscrowProvider =>
        config.get('ESCROW_DRIVER') === 'solana' ? solana : mock,
    },
  ],
  exports: [MilestoneService],
})
export class MilestoneModule {}
