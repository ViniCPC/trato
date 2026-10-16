import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DevFaucetController } from './dev-faucet.controller';
import { DevFaucetService } from './dev-faucet.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DevFaucetController],
  providers: [DevFaucetService],
})
export class DevFaucetModule {}
