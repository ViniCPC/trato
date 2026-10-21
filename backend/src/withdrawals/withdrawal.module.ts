import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MockPayoutProvider } from './mock-payout.provider';
import { PAYOUT_PROVIDER, type PayoutProvider } from './payout.provider';
import { PagFinancePayoutProvider } from './pagfinance-payout.provider';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';

@Module({
  imports: [PrismaModule, AuthModule, LedgerModule],
  controllers: [WithdrawalController],
  providers: [
    WithdrawalService,
    MockPayoutProvider,
    PagFinancePayoutProvider,
    {
      provide: PAYOUT_PROVIDER,
      inject: [ConfigService, MockPayoutProvider, PagFinancePayoutProvider],
      useFactory: (
        config: ConfigService,
        mock: MockPayoutProvider,
        pagFinance: PagFinancePayoutProvider,
      ): PayoutProvider =>
        config.get('PAYOUT_DRIVER') === 'pagfinance' ? pagFinance : mock,
    },
  ],
})
export class WithdrawalModule {}
