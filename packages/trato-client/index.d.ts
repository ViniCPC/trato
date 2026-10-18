import type { PublicKey } from '@solana/web3.js';
import type { TratoEscrow } from './types/trato_escrow.js';

export type EscrowAction = 'fund' | 'submit' | 'release' | 'refund' | 'claim';

export declare const TRATO_ESCROW_PROGRAM_ID: PublicKey;
export declare const ESCROW_SEED: Uint8Array;
export declare const IDL: Readonly<TratoEscrow>;

export declare function uuidToBytes(uuid: string): Uint8Array;
export declare function findEscrowPda(
  client: string | PublicKey,
  milestoneId: string,
  programId?: string | PublicKey,
): Promise<readonly [PublicKey, number]>;
export declare function getInstructionDiscriminator(action: EscrowAction): Uint8Array;
export declare function getEscrowAccountDiscriminator(): Uint8Array;
export declare function getConfigAccountDiscriminator(): Uint8Array;
