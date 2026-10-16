import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfirmEscrowDto } from './dto/confirm-escrow.dto';
import type { EscrowAction } from './escrow.provider';
import { MilestoneActionService } from './milestone-action.service';

type AuthenticatedRequest = { user: { id: string } };

function parseAction(value: string): EscrowAction {
  if (
    value === 'fund' ||
    value === 'submit' ||
    value === 'release' ||
    value === 'refund'
  ) {
    return value;
  }
  throw new BadRequestException('Ação de escrow inválida');
}

@Controller('milestones')
@UseGuards(JwtAuthGuard)
@ApiTags('escrow')
@ApiBearerAuth()
export class EscrowActionController {
  constructor(private readonly actions: MilestoneActionService) {}

  @Post(':milestoneId/:action/prepare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Monta uma transação para a carteira assinar' })
  prepare(
    @Param('milestoneId', new ParseUUIDPipe()) milestoneId: string,
    @Param('action') actionValue: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.actions.prepare(
      milestoneId,
      request.user.id,
      parseAction(actionValue),
    );
  }

  @Post(':milestoneId/:action/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Valida a transação on-chain e persiste o resultado',
  })
  confirm(
    @Param('milestoneId', new ParseUUIDPipe()) milestoneId: string,
    @Param('action') actionValue: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConfirmEscrowDto,
  ) {
    return this.actions.confirm(
      milestoneId,
      request.user.id,
      parseAction(actionValue),
      dto.signature,
    );
  }
}
