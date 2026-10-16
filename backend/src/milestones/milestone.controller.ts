import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestoneService } from './milestone.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

type AuthenticatedRequest = { user: { id: string } };

@Controller('projects/:projectId/milestones')
@UseGuards(JwtAuthGuard)
@ApiTags('milestones')
@ApiBearerAuth()
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Post()
  createMilestone(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestoneService.createMilestone(
      projectId,
      request.user.id,
      dto,
    );
  }

  @Get()
  findAllMilestones(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.milestoneService.findAllMilestones(projectId, request.user.id);
  }

  @Patch(':milestoneId')
  updateMilestone(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('milestoneId', new ParseUUIDPipe()) milestoneId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestoneService.updateMilestone(
      projectId,
      milestoneId,
      request.user.id,
      dto,
    );
  }

  @Delete(':milestoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMilestone(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('milestoneId', new ParseUUIDPipe()) milestoneId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.milestoneService.deleteMilestone(
      projectId,
      milestoneId,
      request.user.id,
    );
  }
}
