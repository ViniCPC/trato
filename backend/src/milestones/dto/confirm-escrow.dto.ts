import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmEscrowDto {
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  signature!: string;
}
