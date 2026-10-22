import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const execFile = promisify(execFileCallback);
const statePath = new URL("../.devnet/trato.json", import.meta.url);
const rpcUrl = required("SOLANA_RPC_URL");
const authority = required("DEPLOYER_KEYPAIR");
const desiredBalance = parseTokenAmount(process.env.BRLP_TEST_BALANCE ?? "100");
const programId = new PublicKey(required("SOLANA_PROGRAM_ID"));
const maxAmount = parseTokenAmount(process.env.ESCROW_MAX_AMOUNT ?? "1000");
const claimDelaySeconds = parsePositiveInteger(
  process.env.CLAIM_DELAY_SECONDS ?? "300",
);
const connection = new Connection(rpcUrl, "confirmed");

const UPGRADEABLE_LOADER_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111",
);

interface DevnetState {
  rpcUrl: string;
  mint: string;
  decimals: 6;
  programId?: string;
  config?: string;
  freelancer?: string;
  maxAmountBaseUnits?: string;
  claimDelaySeconds?: number;
}

async function run(command: string, args: string[]): Promise<string> {
  const { stdout } = await execFile(command, args, { windowsHide: true });
  return stdout.trim();
}

async function loadState(): Promise<DevnetState | null> {
  try {
    return JSON.parse(await readFile(statePath, "utf8")) as DevnetState;
  } catch {
    return null;
  }
}

async function createMint(): Promise<string> {
  const output = await run("spl-token", [
    "create-token",
    "--decimals",
    "6",
    "--url",
    rpcUrl,
    "--fee-payer",
    authority,
    "--mint-authority",
    authority,
  ]);
  const match = output.match(/Address:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/);
  if (!match)
    throw new Error(`Não foi possível extrair o mint do spl-token:\n${output}`);
  return match[1];
}

async function ensureWalletBalance(
  mint: string,
  wallet: string,
): Promise<void> {
  const tokenAccount = await run("spl-token", [
    "address",
    "--token",
    mint,
    "--owner",
    wallet,
  ]);
  try {
    await run("spl-token", ["account-info", tokenAccount, "--url", rpcUrl]);
  } catch {
    await run("spl-token", [
      "create-account",
      mint,
      "--owner",
      wallet,
      "--fee-payer",
      authority,
      "--url",
      rpcUrl,
    ]);
  }

  let current = 0n;
  try {
    current = parseTokenAmount(
      await run("spl-token", [
        "balance",
        mint,
        "--owner",
        wallet,
        "--url",
        rpcUrl,
      ]),
    );
  } catch {
    // Newly created accounts have a zero balance.
  }
  if (current >= desiredBalance) return;

  await run("spl-token", [
    "mint",
    mint,
    formatTokenAmount(desiredBalance - current),
    tokenAccount,
    "--mint-authority",
    authority,
    "--fee-payer",
    authority,
    "--url",
    rpcUrl,
  ]);
}

function parseTokenAmount(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    throw new Error(`Valor BRLP inválido: ${value}`);
  }
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

function formatTokenAmount(value: bigint): string {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório`);
  return value;
}

function parsePositiveInteger(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Inteiro positivo inválido: ${value}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Inteiro positivo inválido: ${value}`);
  }
  return parsed;
}

function instructionDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function encodeU64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function encodeI64(value: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(BigInt(value));
  return buffer;
}

async function loadKeypair(filePath: string): Promise<Keypair> {
  const secret: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (
    !Array.isArray(secret) ||
    secret.some((value) => !Number.isInteger(value))
  ) {
    throw new Error("DEPLOYER_KEYPAIR não contém um keypair Solana válido");
  }
  return Keypair.fromSecretKey(Uint8Array.from(secret as number[]));
}

async function ensureProgramConfig(
  signer: Keypair,
  freelancer: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  const programAccount = await connection.getAccountInfo(
    programId,
    "confirmed",
  );
  if (!programAccount?.executable) {
    throw new Error(
      `Programa ${programId.toBase58()} ainda não está publicado na devnet`,
    );
  }

  const [config] = await PublicKey.findProgramAddress(
    [Buffer.from("config")],
    programId,
  );
  const existing = await connection.getAccountInfo(config, "confirmed");
  let instruction: TransactionInstruction;

  if (existing) {
    const data = Buffer.from(existing.data);
    if (data.length < 122)
      throw new Error("Config on-chain possui tamanho inválido");
    const currentAdmin = new PublicKey(data.subarray(8, 40));
    const currentFreelancer = new PublicKey(data.subarray(40, 72));
    const currentMint = new PublicKey(data.subarray(72, 104));
    if (!currentAdmin.equals(signer.publicKey)) {
      throw new Error(
        `A config pertence a outro admin: ${currentAdmin.toBase58()}`,
      );
    }
    if (!currentFreelancer.equals(freelancer) || !currentMint.equals(mint)) {
      throw new Error(
        "Freelancer ou mint diverge da config existente; publique um novo programa/config para alterá-los",
      );
    }
    instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: false },
        { pubkey: config, isSigner: false, isWritable: true },
      ],
      data: Buffer.concat([
        instructionDiscriminator("update_config"),
        encodeU64(maxAmount),
        encodeI64(claimDelaySeconds),
        Buffer.from([0]),
      ]),
    });
  } else {
    const [programData] = await PublicKey.findProgramAddress(
      [programId.toBytes()],
      UPGRADEABLE_LOADER_ID,
    );
    instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: config, isSigner: false, isWritable: true },
        { pubkey: programId, isSigner: false, isWritable: false },
        { pubkey: programData, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        instructionDiscriminator("initialize_config"),
        Buffer.from(signer.publicKey.toBytes()),
        Buffer.from(freelancer.toBytes()),
        Buffer.from(mint.toBytes()),
        encodeU64(maxAmount),
        encodeI64(claimDelaySeconds),
      ]),
    });
  }

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [signer],
    { commitment: "confirmed" },
  );
  return config;
}

const existing = await loadState();
const mint =
  process.env.BRLP_MINT?.trim() || existing?.mint || (await createMint());
const deployer = await loadKeypair(authority);
const freelancer = new PublicKey(
  process.env.FREELANCER_WALLET?.trim() || deployer.publicKey.toBase58(),
);
const wallets = Array.from(
  new Set(
    (process.env.TEST_WALLETS ?? "")
      .split(",")
      .map((wallet) => wallet.trim())
      .filter(Boolean)
      .concat(freelancer.toBase58()),
  ),
);

for (const wallet of wallets) await ensureWalletBalance(mint, wallet);
const config = await ensureProgramConfig(
  deployer,
  freelancer,
  new PublicKey(mint),
);

await mkdir(new URL("../.devnet/", import.meta.url), { recursive: true });
await writeFile(
  statePath,
  `${JSON.stringify(
    {
      rpcUrl,
      mint,
      decimals: 6,
      programId: programId.toBase58(),
      config: config.toBase58(),
      freelancer: freelancer.toBase58(),
      maxAmountBaseUnits: maxAmount.toString(),
      claimDelaySeconds,
    } satisfies DevnetState,
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(`BRLP-dev pronto: ${mint}`);
console.log(`Config do escrow: ${config.toBase58()}`);
console.log(`Carteiras verificadas: ${wallets.length}`);
