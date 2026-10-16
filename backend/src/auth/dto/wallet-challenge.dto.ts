import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class WalletChallengeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  walletAddress!: string;
}
