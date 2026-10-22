import { readFile } from "node:fs/promises";

import {
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório`);
  return value;
}

async function loadKeypair(filePath: string): Promise<Keypair> {
  const value: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(value) || value.some((item) => !Number.isInteger(item))) {
    throw new Error("SIGNER_KEYPAIR não contém um keypair Solana válido");
  }
  return Keypair.fromSecretKey(Uint8Array.from(value as number[]));
}

const connection = new Connection(required("SOLANA_RPC_URL"), "confirmed");
const signer = await loadKeypair(required("SIGNER_KEYPAIR"));
const transaction = Transaction.from(
  Buffer.from(required("TRANSACTION_BASE64"), "base64"),
);

if (!transaction.feePayer?.equals(signer.publicKey)) {
  throw new Error(
    `O fee payer ${transaction.feePayer?.toBase58() ?? "ausente"} não corresponde ao signer`,
  );
}

const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [signer],
  {
    commitment: "confirmed",
  },
);
console.log(signature);
