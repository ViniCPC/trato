import { z } from 'zod';
import bs58 from 'bs58';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);
const optionalPublicKey = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .string()
    .refine((value) => {
      try {
        return bs58.decode(value).length === 32;
      } catch {
        return false;
      }
    }, 'endereço Solana inválido')
    .optional(),
);

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    FRONTEND_URL: z.string().url().default('http://localhost:4200'),
    PORT: z.coerce.number().int().positive().default(3000),
    ESCROW_DRIVER: z.enum(['mock', 'solana']).default('mock'),
    SOLANA_RPC_URL: optionalUrl,
    SOLANA_PROGRAM_ID: optionalPublicKey,
    SOLANA_TOKEN_MINT: optionalPublicKey,
    SOLANA_CLUSTER: z
      .enum(['devnet', 'testnet', 'mainnet-beta'])
      .default('devnet'),
    FAUCET_AUTHORITY_SECRET: z.string().optional(),
  })
  .superRefine((environment, context) => {
    if (environment.ESCROW_DRIVER !== 'solana') return;

    for (const key of [
      'SOLANA_RPC_URL',
      'SOLANA_PROGRAM_ID',
      'SOLANA_TOKEN_MINT',
    ] as const) {
      if (!environment[key]) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} é obrigatório quando ESCROW_DRIVER=solana`,
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const result = environmentSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
