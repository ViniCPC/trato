import {
  BadGatewayException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type AccountMeta,
  type TransactionResponse,
} from '@solana/web3.js';
import {
  findEscrowPda,
  getEscrowAccountDiscriminator,
  getInstructionDiscriminator,
  uuidToBytes,
} from '@trato/trato-client';
import bs58 from 'bs58';

import type { Environment } from '../config/environment';
import type {
  ConfirmedEscrowTransaction,
  EscrowAction,
  EscrowContext,
  EscrowProvider,
  EscrowSyncAction,
  PreparedEscrowTransaction,
} from './escrow.provider';
import { TransactionPendingError } from './escrow.provider';
import {
  hasExactTokenCredit,
  validateTransactionEvidence,
} from './solana-confirmation';

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

const ACTION_STATUS = {
  fund: 'funded',
  submit: 'submitted',
  release: 'released',
  refund: 'refunded',
} as const;

const ESCROW_ACCOUNT_INDEX = {
  fund: 4,
  submit: 1,
  release: 3,
  refund: 2,
} as const;

const FREELANCER_TOKEN_ACCOUNT_INDEX = 5;

@Injectable()
export class SolanaEscrowProvider implements EscrowProvider {
  private readonly connection: Connection;
  private readonly programId: PublicKey;
  private readonly mint: PublicKey;

  constructor(config: ConfigService<Environment, true>) {
    const rpcUrl = config.get('SOLANA_RPC_URL', { infer: true });
    const programId = config.get('SOLANA_PROGRAM_ID', { infer: true });
    const mint = config.get('SOLANA_TOKEN_MINT', { infer: true });

    // The provider can be instantiated by Nest in mock mode, so defaults are
    // valid public keys; the factory never selects it without validated config.
    this.connection = new Connection(
      rpcUrl ?? 'http://127.0.0.1:8899',
      'confirmed',
    );
    this.programId = new PublicKey(
      programId ?? '11111111111111111111111111111111',
    );
    this.mint = new PublicKey(mint ?? '11111111111111111111111111111111');
  }

  async prepare(
    action: EscrowAction,
    context: EscrowContext,
  ): Promise<PreparedEscrowTransaction> {
    const client = new PublicKey(context.clientWallet);
    const freelancer = new PublicKey(context.freelancerWallet);
    const actor = new PublicKey(context.actorWallet);
    const escrow = await this.deriveEscrow(client, context.milestoneId);
    this.assertStoredEscrow(context.escrowAddress, escrow, action);

    if (action === 'submit') {
      await this.assertEscrowState('fund', escrow, context);
    }

    const instruction = await this.buildInstruction(
      action,
      context,
      actor,
      client,
      freelancer,
      escrow,
    );
    const latest = await this.connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({
      feePayer: actor,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    }).add(instruction);
    const serialized = await transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return {
      driver: 'solana',
      transactionBase64: Buffer.from(serialized).toString('base64'),
      mockSignature: null,
      escrowAddress: escrow.toBase58(),
      lastValidBlockHeight: latest.lastValidBlockHeight.toString(),
    };
  }

  async confirm(
    action: EscrowAction,
    signature: string,
    context: EscrowContext,
  ): Promise<ConfirmedEscrowTransaction> {
    const client = new PublicKey(context.clientWallet);
    const escrow = await this.deriveEscrow(client, context.milestoneId);
    this.assertStoredEscrow(context.escrowAddress, escrow, action);
    const response = await this.findConfirmedTransaction(signature);

    await this.assertTransaction(response, action, context, escrow);
    await this.assertEscrowState(action, escrow, context);

    return {
      signature,
      status: ACTION_STATUS[action],
      escrowAddress: escrow.toBase58(),
    };
  }

  async findUnconfirmedAction(
    context: EscrowContext,
    status: 'funded' | 'submitted',
  ): Promise<EscrowSyncAction | null> {
    const escrow = await this.deriveEscrow(
      new PublicKey(context.clientWallet),
      context.milestoneId,
    );
    this.assertStoredEscrow(context.escrowAddress, escrow, 'submit');

    const account = await this.connection.getAccountInfo(escrow, 'confirmed');
    let possibleActions: readonly EscrowSyncAction['action'][];
    if (account) {
      const chainStatus = Buffer.from(account.data)[128];
      if (chainStatus !== 0 && chainStatus !== 1) {
        throw new ConflictException('Estado on-chain do escrow inválido');
      }
      await this.assertEscrowState(
        chainStatus === 0 ? 'fund' : 'submit',
        escrow,
        context,
      );
      if (chainStatus === 0 && status === 'funded') return null;
      if (chainStatus === 1 && status === 'submitted') return null;
      if (chainStatus === 0) {
        throw new ConflictException('O banco está à frente do escrow on-chain');
      }
      possibleActions = ['submit'];
    } else {
      possibleActions =
        status === 'funded' ? ['release', 'refund'] : ['release'];
    }

    try {
      const signatures = await this.connection.getSignaturesForAddress(
        escrow,
        { limit: 1000 },
        'confirmed',
      );
      for (const entry of signatures) {
        if (entry.err) continue;
        const response = await this.connection.getTransaction(entry.signature, {
          commitment: 'confirmed',
        });
        if (!response) continue;
        for (const action of possibleActions) {
          const actorWallet =
            action === 'submit'
              ? context.freelancerWallet
              : context.clientWallet;
          try {
            await this.assertTransaction(
              response,
              action,
              { ...context, actorWallet },
              escrow,
            );
            return { action, signature: entry.signature };
          } catch (error) {
            if (!(error instanceof ConflictException)) throw error;
          }
        }
      }
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new BadGatewayException('Falha ao consultar o RPC da Solana', {
        cause: error,
      });
    }
    throw new ConflictException(
      'O escrow mudou on-chain, mas a transação correspondente não foi encontrada; informe a assinatura para confirmar',
    );
  }

  private async buildInstruction(
    action: EscrowAction,
    context: EscrowContext,
    actor: PublicKey,
    client: PublicKey,
    freelancer: PublicKey,
    escrow: PublicKey,
  ): Promise<TransactionInstruction> {
    const vault = await this.findAssociatedTokenAddress(escrow);
    const clientToken = await this.findAssociatedTokenAddress(client);
    const freelancerToken = await this.findAssociatedTokenAddress(freelancer);
    const writable = (pubkey: PublicKey, isSigner = false): AccountMeta => ({
      pubkey,
      isSigner,
      isWritable: true,
    });
    const readonly = (pubkey: PublicKey, isSigner = false): AccountMeta => ({
      pubkey,
      isSigner,
      isWritable: false,
    });

    const accounts: Record<EscrowAction, AccountMeta[]> = {
      fund: [
        writable(client, true),
        readonly(freelancer),
        readonly(this.mint),
        writable(clientToken),
        writable(escrow),
        writable(vault),
        readonly(TOKEN_PROGRAM_ID),
        readonly(ASSOCIATED_TOKEN_PROGRAM_ID),
        readonly(SystemProgram.programId),
      ],
      submit: [readonly(freelancer, true), writable(escrow)],
      release: [
        writable(client, true),
        readonly(freelancer),
        readonly(this.mint),
        writable(escrow),
        writable(vault),
        writable(freelancerToken),
        readonly(TOKEN_PROGRAM_ID),
        readonly(ASSOCIATED_TOKEN_PROGRAM_ID),
        readonly(SystemProgram.programId),
      ],
      refund: [
        writable(client, true),
        readonly(this.mint),
        writable(escrow),
        writable(vault),
        writable(clientToken),
        readonly(TOKEN_PROGRAM_ID),
      ],
    };

    const discriminator = Buffer.from(getInstructionDiscriminator(action));
    const data =
      action === 'fund'
        ? Buffer.concat([
            discriminator,
            Buffer.from(uuidToBytes(context.milestoneId)),
            this.encodeU64(context.amountBaseUnits),
          ])
        : discriminator;

    const expectedActor = action === 'submit' ? freelancer : client;
    if (!actor.equals(expectedActor)) {
      throw new ConflictException(
        'A carteira conectada não corresponde ao papel da ação',
      );
    }

    return new TransactionInstruction({
      keys: accounts[action],
      programId: this.programId,
      data,
    });
  }

  private async findAssociatedTokenAddress(
    owner: PublicKey,
  ): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), this.mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    return address;
  }

  private async deriveEscrow(
    client: PublicKey,
    milestoneId: string,
  ): Promise<PublicKey> {
    // The local client package can load a separate copy of web3.js.
    const [address] = await findEscrowPda(
      client.toBase58(),
      milestoneId,
      this.programId.toBase58(),
    );
    return new PublicKey(address.toBase58());
  }

  private encodeU64(value: bigint): Buffer {
    if (value <= 0n || value > 18_446_744_073_709_551_615n) {
      throw new ConflictException('Valor fora do intervalo u64');
    }
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
  }

  private async findConfirmedTransaction(
    signature: string,
  ): Promise<TransactionResponse> {
    for (const delay of [0, 250, 500, 1_000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const response = await this.connection.getTransaction(signature, {
          commitment: 'confirmed',
        });
        if (response) return response;
      } catch (error) {
        if (delay === 1_000) {
          throw new BadGatewayException('Falha ao consultar o RPC da Solana', {
            cause: error,
          });
        }
      }
    }
    throw new TransactionPendingError();
  }

  private async assertTransaction(
    response: TransactionResponse,
    action: EscrowAction,
    context: EscrowContext,
    escrow: PublicKey,
  ): Promise<void> {
    const message = response.transaction.message;
    const requiredSigners = message.accountKeys
      .slice(0, message.header.numRequiredSignatures)
      .map((key) => String(key.toBase58()));
    const expectedDiscriminator = Buffer.from(
      getInstructionDiscriminator(action),
    );
    const failure = validateTransactionEvidence(
      {
        failed: !response.meta || Boolean(response.meta.err),
        requiredSigners,
        instructions: message.instructions.map((instruction) => ({
          programId: String(
            message.accountKeys[instruction.programIdIndex]?.toBase58() ?? '',
          ),
          data: bs58.decode(instruction.data),
          accounts: instruction.accounts.map(
            (index) => message.accountKeys[index]?.toBase58() ?? '',
          ),
        })),
      },
      {
        actorWallet: context.actorWallet,
        programId: String(this.programId.toBase58()),
        discriminator: expectedDiscriminator,
        escrowAddress: escrow.toBase58(),
        escrowAccountIndex: ESCROW_ACCOUNT_INDEX[action],
      },
    );
    if (failure) {
      const messageByFailure = {
        TRANSACTION_FAILED: 'A transação Solana falhou on-chain',
        WRONG_SIGNER: 'A carteira esperada não assinou a transação',
        WRONG_INSTRUCTION: 'A instrução esperada não está na transação',
      } as const;
      throw new ConflictException(messageByFailure[failure]);
    }

    if (action === 'release') {
      const recipient = await this.findAssociatedTokenAddress(
        new PublicKey(context.freelancerWallet),
      );
      const accountIndex = message.accountKeys.findIndex((key) =>
        key.equals(recipient),
      );
      if (
        accountIndex < 0 ||
        !message.instructions.some(
          (instruction) =>
            message.accountKeys[instruction.programIdIndex]?.equals(
              this.programId,
            ) &&
            Buffer.from(bs58.decode(instruction.data))
              .subarray(0, expectedDiscriminator.length)
              .equals(expectedDiscriminator) &&
            message.accountKeys[
              instruction.accounts[ESCROW_ACCOUNT_INDEX.release]
            ]?.equals(escrow) &&
            instruction.accounts[FREELANCER_TOKEN_ACCOUNT_INDEX] ===
              accountIndex,
        ) ||
        !hasExactTokenCredit(
          response.meta?.preTokenBalances,
          response.meta?.postTokenBalances,
          accountIndex,
          this.mint.toBase58(),
          context.amountBaseUnits,
        )
      ) {
        throw new ConflictException(
          'O freelancer não recebeu o valor exato nesta transação',
        );
      }
    }
  }

  private async assertEscrowState(
    action: EscrowAction,
    escrow: PublicKey,
    context: EscrowContext,
  ): Promise<void> {
    const account = await this.connection.getAccountInfo(escrow, 'confirmed');
    if (action === 'release' || action === 'refund') {
      if (account)
        throw new ConflictException('O escrow deveria estar encerrado');
      return;
    }
    if (!account) {
      throw new ConflictException(
        'Escrow não encontrado on-chain; sincronize a etapa antes de continuar',
      );
    }
    if (!account.owner.equals(this.programId) || account.data.length < 130) {
      throw new ConflictException('Conta de escrow ausente ou inválida');
    }

    const data = Buffer.from(account.data);
    if (
      !data.subarray(0, 8).equals(Buffer.from(getEscrowAccountDiscriminator()))
    ) {
      throw new ConflictException('A conta encontrada não é um escrow Trato');
    }
    const client = new PublicKey(data.subarray(8, 40)).toBase58();
    const freelancer = new PublicKey(data.subarray(40, 72)).toBase58();
    const mint = new PublicKey(data.subarray(72, 104)).toBase58();
    const milestone = data.subarray(104, 120);
    const amount = data.readBigUInt64LE(120);
    const status = data[128];
    const expectedStatus = action === 'fund' ? 0 : 1;

    if (
      client !== context.clientWallet ||
      freelancer !== context.freelancerWallet ||
      mint !== this.mint.toBase58() ||
      !milestone.equals(Buffer.from(uuidToBytes(context.milestoneId))) ||
      amount !== context.amountBaseUnits ||
      status !== expectedStatus
    ) {
      throw new ConflictException('O estado on-chain não corresponde à etapa');
    }
  }

  private assertStoredEscrow(
    stored: string | null,
    derived: PublicKey,
    action: EscrowAction,
  ): void {
    if (action !== 'fund' && !stored) {
      throw new ConflictException('A etapa não possui endereço de escrow');
    }
    if (stored && stored !== derived.toBase58()) {
      throw new ConflictException(
        'O endereço de escrow salvo não corresponde ao PDA',
      );
    }
  }
}
