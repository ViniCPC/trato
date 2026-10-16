import { readFile } from 'node:fs/promises';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

import type { Environment } from '../config/environment';

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
const FAUCET_AMOUNT = 100_000_000n;

@Injectable()
export class DevFaucetService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  async mint(walletAddress: string) {
    if (this.config.get('ESCROW_DRIVER', { infer: true }) === 'mock') {
      return {
        signature: `mock_faucet_${Date.now()}`,
        amountBaseUnits: FAUCET_AMOUNT.toString(),
      };
    }

    const rpcUrl = this.config.get('SOLANA_RPC_URL', { infer: true });
    const mintAddress = this.config.get('SOLANA_TOKEN_MINT', { infer: true });
    const secretSource = this.config.get('FAUCET_AUTHORITY_SECRET', {
      infer: true,
    });
    if (!rpcUrl || !mintAddress || !secretSource) {
      throw new BadRequestException('Faucet não configurado neste ambiente');
    }

    const authority = await Keypair.fromSecretKey(
      Uint8Array.from(await this.readSecret(secretSource)),
    );
    const connection = new Connection(rpcUrl, 'confirmed');
    const owner = new PublicKey(walletAddress);
    const mint = new PublicKey(mintAddress);
    const [tokenAccount] = await PublicKey.findProgramAddress(
      [owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const latest = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({
      feePayer: authority.publicKey,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    });

    if (!(await connection.getAccountInfo(tokenAccount, 'confirmed'))) {
      transaction.add(
        new TransactionInstruction({
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: authority.publicKey, isSigner: true, isWritable: true },
            { pubkey: tokenAccount, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            {
              pubkey: SystemProgram.programId,
              isSigner: false,
              isWritable: false,
            },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data: new Uint8Array(),
        }),
      );
    }

    const mintData = Buffer.alloc(9);
    mintData[0] = 7;
    mintData.writeBigUInt64LE(FAUCET_AMOUNT, 1);
    transaction.add(
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: mint, isSigner: false, isWritable: true },
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        ],
        data: mintData,
      }),
    );
    await transaction.sign(authority);
    const signature = await connection.sendRawTransaction(
      await transaction.serialize(),
    );
    await connection.confirmTransaction({
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    });
    return { signature, amountBaseUnits: FAUCET_AMOUNT.toString() };
  }

  private async readSecret(source: string): Promise<number[]> {
    const raw = source.trim().startsWith('[')
      ? source
      : await readFile(source, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 64 ||
      !parsed.every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 255,
      )
    ) {
      throw new BadRequestException('FAUCET_AUTHORITY_SECRET inválido');
    }
    return parsed as number[];
  }
}
