import { Injectable, computed, signal } from '@angular/core';
import { PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

interface PhantomConnectOptions {
  onlyIfTrusted?: boolean;
}

interface PhantomConnectResult {
  publicKey: PublicKey;
}

interface PhantomSendResult {
  signature: string;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect(options?: PhantomConnectOptions): Promise<PhantomConnectResult>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, display?: 'utf8' | 'hex'): Promise<{ signature: Uint8Array }>;
  signAndSendTransaction(transaction: Transaction): Promise<PhantomSendResult>;
  on(event: 'connect', listener: (publicKey: PublicKey) => void): void;
  on(event: 'disconnect', listener: () => void): void;
  on(event: 'accountChanged', listener: (publicKey: PublicKey | null) => void): void;
}

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
  }
}

export function isWalletUserRejection(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 4001;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly providerState = signal<PhantomProvider | null>(null);
  private readonly publicKeyState = signal<string | null>(null);

  readonly installed = computed(() => this.providerState() !== null);
  readonly publicKey = this.publicKeyState.asReadonly();
  readonly connected = computed(() => this.publicKeyState() !== null);

  constructor() {
    if (typeof window === 'undefined') return;
    const provider = window.phantom?.solana ?? null;
    this.providerState.set(provider);
    if (!provider) return;

    provider.on('connect', (publicKey) => this.publicKeyState.set(publicKey.toBase58()));
    provider.on('disconnect', () => this.publicKeyState.set(null));
    provider.on('accountChanged', (publicKey) =>
      this.publicKeyState.set(publicKey?.toBase58() ?? null),
    );
    void provider
      .connect({ onlyIfTrusted: true })
      .then(({ publicKey }) => this.publicKeyState.set(publicKey.toBase58()))
      .catch(() => undefined);
  }

  async connect(): Promise<string> {
    const provider = this.requireProvider();
    const result = await provider.connect();
    const address = result.publicKey.toBase58();
    this.publicKeyState.set(address);
    return address;
  }

  async disconnect(): Promise<void> {
    const provider = this.providerState();
    if (provider) await provider.disconnect();
    this.publicKeyState.set(null);
  }

  async signMessage(message: string): Promise<string> {
    const result = await this.requireProvider().signMessage(
      new TextEncoder().encode(message),
      'utf8',
    );
    return bs58.encode(result.signature);
  }

  async signAndSendTransaction(transactionBase64: string): Promise<string> {
    const bytes = Uint8Array.from(atob(transactionBase64), (character) => character.charCodeAt(0));
    const transaction = Transaction.from(bytes);
    const result = await this.requireProvider().signAndSendTransaction(transaction);
    return result.signature;
  }

  private requireProvider(): PhantomProvider {
    const provider = this.providerState();
    if (!provider) {
      throw new Error('PHANTOM_NOT_INSTALLED');
    }
    return provider;
  }
}
