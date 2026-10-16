import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateWalletDto {
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    walletAddress!: string;
}