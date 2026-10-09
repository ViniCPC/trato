import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { isWalletUserRejection, WalletService } from '../../../core/wallet/wallet.service';
import {
  ConfirmedEscrowTransaction,
  MilestoneAction,
  PreparedEscrowTransaction,
  ProjectMilestone,
} from '../models/project.model';
import { ProjectsApiService } from './projects-api.service';

export type TransactionStep = 'preparing' | 'awaiting_signature' | 'confirming' | 'done';

@Injectable({ providedIn: 'root' })
export class TransactionFlowService {
  private readonly api = inject(ProjectsApiService);
  private readonly auth = inject(AuthService);
  private readonly wallet = inject(WalletService);
  private readonly toast = inject(ToastService);
  private readonly stepState = signal<TransactionStep>('preparing');

  readonly step = this.stepState.asReadonly();

  async execute(
    milestone: ProjectMilestone,
    action: MilestoneAction,
  ): Promise<ConfirmedEscrowTransaction> {
    this.stepState.set('preparing');
    try {
      let prepared = await firstValueFrom(this.api.prepareMilestoneAction(milestone.id, action));
      let signature: string;

      if (prepared.driver === 'mock') {
        signature = this.requireMockSignature(prepared);
        this.stepState.set('awaiting_signature');
      } else {
        await this.assertCorrectWallet();
        this.stepState.set('awaiting_signature');
        try {
          signature = await this.signPrepared(prepared);
        } catch (error) {
          if (!this.isExpiredBlockhash(error)) throw error;
          prepared = await firstValueFrom(this.api.prepareMilestoneAction(milestone.id, action));
          signature = await this.signPrepared(prepared);
        }
      }

      this.stepState.set('confirming');
      const confirmed = await this.confirmWithRetry(milestone.id, action, signature);
      this.stepState.set('done');
      return confirmed;
    } catch (error) {
      this.showWalletError(error);
      throw error;
    }
  }

  reset(): void {
    this.stepState.set('preparing');
  }

  private async signPrepared(prepared: PreparedEscrowTransaction): Promise<string> {
    if (!prepared.transactionBase64) throw new Error('TRANSACTION_MISSING');
    return this.wallet.signAndSendTransaction(prepared.transactionBase64);
  }

  private async assertCorrectWallet(): Promise<void> {
    const connected = this.wallet.publicKey() ?? (await this.wallet.connect());
    const linked = this.auth.currentUser()?.walletAddress ?? null;
    if (!linked || linked !== connected) throw new Error('WRONG_WALLET');
  }

  private requireMockSignature(prepared: PreparedEscrowTransaction): string {
    if (!prepared.mockSignature) throw new Error('MOCK_SIGNATURE_MISSING');
    return prepared.mockSignature;
  }

  private async confirmWithRetry(
    milestoneId: string,
    action: MilestoneAction,
    signature: string,
  ): Promise<ConfirmedEscrowTransaction> {
    for (const delay of [0, 600, 1_200, 2_000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      const result = await firstValueFrom(
        this.api.confirmMilestoneAction(milestoneId, action, signature),
      );
      if (result && typeof result === 'object' && 'status' in result) return result;
    }
    throw new Error('CONFIRMATION_TIMEOUT');
  }

  private isExpiredBlockhash(error: unknown): boolean {
    const message = this.errorMessage(error).toLowerCase();
    return message.includes('blockhash') || message.includes('block height exceeded');
  }

  private showWalletError(error: unknown): void {
    if (isWalletUserRejection(error) || error instanceof HttpErrorResponse) return;
    const message = this.errorMessage(error);
    if (message.includes('WRONG_WALLET')) {
      this.toast.show('Carteira incorreta', {
        description: 'Conecte na Phantom a carteira vinculada à sua conta.',
        tone: 'error',
      });
    } else if (message.includes('WALLET_NOT_CONNECTED')) {
      this.toast.show('Conecte sua carteira antes de continuar', { tone: 'error' });
    } else if (message.toLowerCase().includes('insufficient')) {
      this.toast.show('Saldo insuficiente para concluir a transação', { tone: 'error' });
    } else if (message.includes('PHANTOM_NOT_INSTALLED')) {
      this.toast.show('Instale a Phantom para assinar a transação', { tone: 'error' });
    } else {
      this.toast.show('A transação não foi concluída', { tone: 'error' });
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return typeof error === 'string' ? error : 'UNKNOWN_TRANSACTION_ERROR';
  }
}
