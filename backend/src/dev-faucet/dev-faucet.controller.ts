import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { DevFaucetService } from './dev-faucet.service';

@Controller('dev/faucet')
@UseGuards(JwtAuthGuard)
export class DevFaucetController {
  private readonly lastRequest = new Map<string, number>();

  constructor(
    private readonly faucet: DevFaucetService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async mint(@Req() request: { user: { id: string } }) {
    const previous = this.lastRequest.get(request.user.id) ?? 0;
    if (Date.now() - previous < 60_000) {
      throw new HttpException(
        'Aguarde um minuto antes de pedir mais BRLP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const user = await this.prisma.orm.public.User.where({
      id: request.user.id,
    }).first();
    if (!user?.walletAddress) {
      throw new UnauthorizedException('Vincule uma carteira primeiro');
    }
    this.lastRequest.set(request.user.id, Date.now());
    return this.faucet.mint(user.walletAddress);
  }
}
