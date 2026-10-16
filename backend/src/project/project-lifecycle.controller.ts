import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectLifecycleService } from './project-lifecycle.service';

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectLifecycleController {
  constructor(
    private readonly lifecycle: ProjectLifecycleService,
  ) {}

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activateProject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.lifecycle.activateProject(
      id,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelProject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.lifecycle.cancelProject(
      id,
      request.user.id,
    );
  }
}