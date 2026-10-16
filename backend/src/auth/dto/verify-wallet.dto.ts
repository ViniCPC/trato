import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class VerifyWalletDto {
  @IsUUID()
  challengeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  signature!: string;
}
