import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfirmWithdrawalDto } from './dto/confirm-withdrawal.dto';
import { ListWithdrawalsQueryDto } from './dto/list-withdrawals-query.dto';
import { QuoteWithdrawalDto } from './dto/quote-withdrawal.dto';
import { WithdrawalService } from './withdrawal.service';

type AuthenticatedRequest = { user: { id: string } };

@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
@ApiTags('withdrawals')
@ApiBearerAuth()
export class WithdrawalController {
  constructor(private readonly withdrawals: WithdrawalService) {}

  @Post('quote')
  quote(
    @Req() request: AuthenticatedRequest,
    @Body() dto: QuoteWithdrawalDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.withdrawals.quote(request.user.id, dto, idempotencyKey);
  }

  @Post(':id/prepare')
  @HttpCode(HttpStatus.OK)
  prepare(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.withdrawals.prepare(id, request.user.id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConfirmWithdrawalDto,
  ) {
    return this.withdrawals.confirm(id, request.user.id, dto);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  sync(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.withdrawals.sync(id, request.user.id);
  }

  @Get()
  listMine(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListWithdrawalsQueryDto,
  ) {
    return this.withdrawals.listMine(request.user.id, query);
  }

  @Get(':id')
  findMine(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.withdrawals.findMine(id, request.user.id);
  }
}
