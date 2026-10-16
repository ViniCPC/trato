import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { WalletChallengeDto } from './dto/wallet-challenge.dto';
import { VerifyWalletDto } from './dto/verify-wallet.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get()
  me(@Req() request: { user: { id: string } }) {
    return this.auth.me(request.user.id);
  }

  @Post('wallet/challenge')
  createWalletChallenge(
    @Req() request: { user: { id: string } },
    @Body() dto: WalletChallengeDto,
  ) {
    return this.auth.createWalletChallenge(request.user.id, dto);
  }

  @Post('wallet/verify')
  verifyWallet(
    @Req() request: { user: { id: string } },
    @Body() dto: VerifyWalletDto,
  ) {
    return this.auth.verifyWallet(request.user.id, dto);
  }
}
