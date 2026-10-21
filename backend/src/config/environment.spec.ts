import { validateEnvironment } from './environment';

const base = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/trato',
  JWT_SECRET: 'segredo-de-teste-com-mais-de-32-bytes',
};

describe('validateEnvironment', () => {
  it('usa o driver mock sem exigir configuração Solana', () => {
    expect(validateEnvironment(base).ESCROW_DRIVER).toBe('mock');
  });

  it('falha no boot quando o driver Solana está incompleto', () => {
    expect(() =>
      validateEnvironment({ ...base, ESCROW_DRIVER: 'solana' }),
    ).toThrow(/SOLANA_RPC_URL/);
  });

  it('aceita a configuração Solana completa', () => {
    expect(
      validateEnvironment({
        ...base,
        ESCROW_DRIVER: 'solana',
        SOLANA_RPC_URL: 'https://api.devnet.solana.com',
        SOLANA_PROGRAM_ID: '973yrLGt8Jro3ak66GxTyBXBYens5di54txDxJFGJNxG',
        SOLANA_TOKEN_MINT: '11111111111111111111111111111111',
      }).ESCROW_DRIVER,
    ).toBe('solana');
  });

  it('usa o provider mock de saque por padrão', () => {
    expect(validateEnvironment(base).PAYOUT_DRIVER).toBe('mock');
  });

  it('falha no boot quando a PagFinance está incompleta', () => {
    expect(() =>
      validateEnvironment({ ...base, PAYOUT_DRIVER: 'pagfinance' }),
    ).toThrow(/PAGFINANCE_BASE_URL/);
  });

  it('aceita a configuração completa da PagFinance', () => {
    expect(
      validateEnvironment({
        ...base,
        PAYOUT_DRIVER: 'pagfinance',
        PAGFINANCE_BASE_URL: 'https://sandbox.brlp.io/api/v1',
        PAGFINANCE_API_TOKEN: 'sandbox-token',
        PAGFINANCE_BRLP_ASSET_ID: '1',
        PAGFINANCE_APP_NAME: 'trato',
        PAGFINANCE_APP_DOMAIN: 'trato.example',
        PAGFINANCE_APP_VERSION: '1.0.0',
        SOLANA_RPC_URL: 'https://api.devnet.solana.com',
        SOLANA_TOKEN_MINT: '11111111111111111111111111111111',
      }).PAYOUT_DRIVER,
    ).toBe('pagfinance');
  });
});
