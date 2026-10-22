import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateMilestoneDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'amountBaseUnits deve ser um inteiro positivo enviado como string',
  })
  @MaxLength(19)
  amountBaseUnits?: string;
}
