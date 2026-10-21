import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import { LedgerService } from './ledger.service';

type AuthenticatedRequest = { user: { id: string } };

@Controller('ledger')
@UseGuards(JwtAuthGuard)
@ApiTags('ledger')
@ApiBearerAuth()
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('me')
  listMine(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListLedgerQueryDto,
  ) {
    return this.ledger.listMine(request.user.id, query);
  }
}
