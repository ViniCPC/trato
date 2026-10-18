import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { MilestoneActionService } from './milestone-action.service';

@Controller('escrow')
@ApiTags('escrow')
export class EscrowRulesController {
  constructor(private readonly actions: MilestoneActionService) {}

  @Get('rules')
  @ApiOperation({ summary: 'Regras públicas da configuração on-chain' })
  rules() {
    return this.actions.getRules();
  }
}
