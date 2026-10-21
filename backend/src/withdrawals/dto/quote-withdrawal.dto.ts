import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class QuoteWithdrawalDto {
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'amountBaseUnits deve ser um inteiro positivo enviado como string',
  })
  @MaxLength(19)
  amountBaseUnits!: string;

  @Transform(({ value }) => {
    const input: unknown = value;
    return typeof input === 'string' ? input.trim() : input;
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  pixKey!: string;
}
