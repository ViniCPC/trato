import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  createProject(
    @Req() request: { user: { id: string } },
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.createProject(request.user.id, dto);
  }

  @Get()
  findAllProjects(
    @Req() request: { user: { id: string } },
    @Query() query: ListProjectsQueryDto,
  ) {
    return this.projectService.findAllProjects(request.user.id, query);
  }

  @Get(':id')
  findProjectById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: { user: { id: string } },
  ) {
    return this.projectService.findProjectById(id, request.user.id);
  }

  @Patch(':id')
  updateProject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: { user: { id: string } },
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(id, request.user.id, dto);
  }

  @Delete(':id')
  deleteProject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: { user: { id: string } },
  ) {
    return this.projectService.deleteProject(id, request.user.id);
  }
}
