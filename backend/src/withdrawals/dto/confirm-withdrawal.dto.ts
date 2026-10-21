import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmWithdrawalDto {
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  signature!: string;
}
