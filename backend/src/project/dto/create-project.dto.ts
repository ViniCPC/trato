import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateProjectMilestoneDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'amountBaseUnits deve ser um inteiro positivo enviado como string',
  })
  @MaxLength(19)
  amountBaseUnits!: string;
}

export class CreateProjectDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  freelancerEmail!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'O projeto precisa ter pelo menos uma etapa' })
  @ValidateNested({ each: true })
  @Type(() => CreateProjectMilestoneDto)
  milestones!: CreateProjectMilestoneDto[];
}
