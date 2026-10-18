import { readFileSync } from 'node:fs';

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { IDL, TRATO_ESCROW_PROGRAM_ID } from '@trato/trato-client';

const UPGRADEABLE_LOADER_ID = new PublicKey(
  'BPFLoaderUpgradeab1e11111111111111111111111',
);

function option(name, required = true) {
  const position = process.argv.indexOf(name);
  const value = position < 0 ? undefined : process.argv[position + 1];
  if (required && (!value || value.startsWith('--'))) {
    throw new Error(`Informe ${name}`);
  }
  return value;
}

function positiveInteger(value, name, maximum) {
  if (!value || !/^\d+$/.test(value))
    throw new Error(`${name} deve ser inteiro positivo`);
  const result = BigInt(value);
  if (result === 0n || result > maximum)
    throw new Error(`${name} fora do intervalo`);
  return result;
}

const operation = option('--operation');
if (operation !== 'initialize' && operation !== 'update') {
  throw new Error('--operation deve ser initialize ou update');
}
const rpcUrl = option('--rpc', false) ?? 'https://api.devnet.solana.com';
if (new URL(rpcUrl).hostname !== 'api.devnet.solana.com') {
  throw new Error('Este script aceita somente o RPC público da devnet');
}
const signer = await Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(option('--keypair'), 'utf8'))),
);
const maxAmount = positiveInteger(
  option('--max-amount'),
  '--max-amount',
  2n ** 64n - 1n,
);
const delay = positiveInteger(
  option('--delay-seconds'),
  '--delay-seconds',
  2_592_000n,
);
const pausedValue = option('--paused', false) ?? 'false';
if (pausedValue !== 'true' && pausedValue !== 'false') {
  throw new Error('--paused deve ser true ou false');
}

const [config] = await PublicKey.findProgramAddress(
  [Buffer.from('config')],
  TRATO_ESCROW_PROGRAM_ID,
);
const connection = new Connection(rpcUrl, 'confirmed');
const instructionDef = IDL.instructions.find(
  (item) => item.name === `${operation}_config`,
);
if (!instructionDef) throw new Error('IDL sem instrução de config');
const maxBytes = Buffer.alloc(8);
maxBytes.writeBigUInt64LE(maxAmount);
const delayBytes = Buffer.alloc(8);
delayBytes.writeBigInt64LE(delay);

let keys;
let data;
if (operation === 'initialize') {
  const adminOption = option('--admin', false);
  const admin = adminOption ? new PublicKey(adminOption) : signer.publicKey;
  const freelancer = new PublicKey(option('--freelancer'));
  const mint = new PublicKey(option('--mint'));
  const [programData] = await PublicKey.findProgramAddress(
    [TRATO_ESCROW_PROGRAM_ID.toBytes()],
    UPGRADEABLE_LOADER_ID,
  );
  keys = [
    { pubkey: signer.publicKey, isSigner: true, isWritable: true },
    { pubkey: config, isSigner: false, isWritable: true },
    { pubkey: TRATO_ESCROW_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: programData, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  data = Buffer.concat([
    Buffer.from(instructionDef.discriminator),
    Buffer.from(admin.toBytes()),
    Buffer.from(freelancer.toBytes()),
    Buffer.from(mint.toBytes()),
    maxBytes,
    delayBytes,
  ]);
} else {
  keys = [
    { pubkey: signer.publicKey, isSigner: true, isWritable: false },
    { pubkey: config, isSigner: false, isWritable: true },
  ];
  data = Buffer.concat([
    Buffer.from(instructionDef.discriminator),
    maxBytes,
    delayBytes,
    Buffer.from([pausedValue === 'true' ? 1 : 0]),
  ]);
}

const instruction = new TransactionInstruction({
  programId: TRATO_ESCROW_PROGRAM_ID,
  keys,
  data,
});
if (process.argv.includes('--dry-run')) {
  console.log(
    `Dry run: ${operation} config ${config.toBase58()}, ${keys.length} contas, ${data.length} bytes`,
  );
} else {
  const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [signer],
    { commitment: 'confirmed' },
  );
  console.log(`Config ${config.toBase58()} atualizada na devnet: ${signature}`);
}
