import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectLifecycleController } from './project-lifecycle.controller';
import { ProjectLifecycleService } from './project-lifecycle.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProjectLifecycleController],
  providers: [ProjectLifecycleService],
  exports: [ProjectLifecycleService],
})
export class ProjectLifecycleModule {}
