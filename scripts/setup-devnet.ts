import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const statePath = new URL('../.devnet/trato.json', import.meta.url);
const rpcUrl = required('SOLANA_RPC_URL');
const authority = required('DEPLOYER_KEYPAIR');
const desiredBalance = parseTokenAmount(process.env.BRLP_TEST_BALANCE ?? '100');

interface DevnetState {
  rpcUrl: string;
  mint: string;
  decimals: 6;
}

async function run(command: string, args: string[]): Promise<string> {
  const { stdout } = await execFile(command, args, { windowsHide: true });
  return stdout.trim();
}

async function loadState(): Promise<DevnetState | null> {
  try {
    return JSON.parse(await readFile(statePath, 'utf8')) as DevnetState;
  } catch {
    return null;
  }
}

async function createMint(): Promise<string> {
  const output = await run('spl-token', [
    'create-token',
    '--decimals',
    '6',
    '--url',
    rpcUrl,
    '--fee-payer',
    authority,
    '--mint-authority',
    authority,
  ]);
  const match = output.match(/Address:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/);
  if (!match) throw new Error(`Não foi possível extrair o mint do spl-token:\n${output}`);
  return match[1];
}

async function ensureWalletBalance(mint: string, wallet: string): Promise<void> {
  const tokenAccount = await run('spl-token', [
    'address',
    '--token',
    mint,
    '--owner',
    wallet,
  ]);
  try {
    await run('spl-token', ['account-info', tokenAccount, '--url', rpcUrl]);
  } catch {
    await run('spl-token', [
      'create-account',
      mint,
      '--owner',
      wallet,
      '--fee-payer',
      authority,
      '--url',
      rpcUrl,
    ]);
  }

  let current = 0n;
  try {
    current = parseTokenAmount(
      await run('spl-token', ['balance', mint, '--owner', wallet, '--url', rpcUrl]),
    );
  } catch {
    // Newly created accounts have a zero balance.
  }
  if (current >= desiredBalance) return;

  await run('spl-token', [
    'mint',
    mint,
    formatTokenAmount(desiredBalance - current),
    tokenAccount,
    '--mint-authority',
    authority,
    '--fee-payer',
    authority,
    '--url',
    rpcUrl,
  ]);
}

function parseTokenAmount(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    throw new Error(`Valor BRLP inválido: ${value}`);
  }
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
}

function formatTokenAmount(value: bigint): string {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório`);
  return value;
}

const existing = await loadState();
const mint = process.env.BRLP_MINT?.trim() || existing?.mint || (await createMint());
const wallets = (process.env.TEST_WALLETS ?? '')
  .split(',')
  .map((wallet) => wallet.trim())
  .filter(Boolean);

for (const wallet of wallets) await ensureWalletBalance(mint, wallet);

await mkdir(new URL('../.devnet/', import.meta.url), { recursive: true });
await writeFile(
  statePath,
  `${JSON.stringify({ rpcUrl, mint, decimals: 6 } satisfies DevnetState, null, 2)}\n`,
  'utf8',
);
console.log(`BRLP-dev pronto: ${mint}`);
console.log(`Carteiras verificadas: ${wallets.length}`);
