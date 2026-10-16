import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export const projectRoles = ['client', 'freelancer'] as const;
export type ProjectRole = (typeof projectRoles)[number];

export class ListProjectsQueryDto {
  @IsIn(projectRoles)
  role: ProjectRole = 'client';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}
