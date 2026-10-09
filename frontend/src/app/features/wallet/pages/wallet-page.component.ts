import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { isWalletUserRejection, WalletService } from '../../../core/wallet/wallet.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-wallet-page',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <p class="text-sm font-semibold text-web3-700">CARTEIRA</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
        Sua identidade na Solana
      </h1>
      <p class="mt-3 max-w-2xl text-ink-500">
        A Phantom assina localmente. Sua chave privada nunca é enviada ao Trato.
      </p>

      <section class="mt-8 rounded-card border border-ink-200 bg-white p-5 sm:p-7">
        @if (!wallet.installed()) {
          <h2 class="text-lg font-semibold text-ink-900">Phantom não encontrada</h2>
          <p class="mt-2 text-sm text-ink-500">Instale a extensão oficial e recarregue.</p>
          <a
            class="mt-5 inline-flex rounded-lg bg-web3-700 px-4 py-2.5 text-sm font-semibold text-white"
            href="https://phantom.com/download"
            target="_blank"
            rel="noopener noreferrer"
            >Instalar Phantom</a
          >
        } @else {
          <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-medium text-ink-500">Carteira conectada</p>
              <p class="mt-1 font-mono text-sm font-semibold text-ink-900">
                {{ shortConnectedAddress() || 'Nenhuma' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              @if (!wallet.connected()) {
                <app-button [loading]="busy()" (pressed)="connect()">Conectar Phantom</app-button>
              } @else {
                <app-button
                  [loading]="busy()"
                  [disabled]="linkedToConnectedWallet()"
                  (pressed)="linkWallet()"
                >
                  {{ linkedToConnectedWallet() ? 'Carteira vinculada' : 'Vincular à conta' }}
                </app-button>
                <app-button variant="secondary" (pressed)="disconnect()">Desconectar</app-button>
              }
            </div>
          </div>

          @if (linkedAddress()) {
            <div class="mt-6 rounded-xl bg-ink-50 p-4">
              <p class="text-xs text-ink-500">Carteira vinculada ao seu usuário</p>
              <p class="mt-1 font-mono text-sm break-all text-ink-900">{{ linkedAddress() }}</p>
              @if (walletMismatch()) {
                <p class="mt-3 text-sm font-medium text-red-700">
                  A carteira conectada é diferente da vinculada. Troque a conta na Phantom.
                </p>
              }
            </div>
          }

          @if (!environment.production && linkedToConnectedWallet()) {
            <div class="mt-6 border-t border-ink-100 pt-6">
              <p class="text-sm font-semibold text-ink-900">BRLP de desenvolvimento</p>
              <p class="mt-1 text-sm text-ink-500">
                Receba 100 BRLP na devnet para testar o financiamento.
              </p>
              <app-button
                class="mt-4"
                variant="secondary"
                [loading]="faucetLoading()"
                (pressed)="requestFaucet()"
                >Pedir BRLP de teste</app-button
              >
            </div>
          }
        }
      </section>
    </div>
  `,
})
export class WalletPageComponent {
  protected readonly wallet = inject(WalletService);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly environment = environment;
  protected readonly busy = signal(false);
  protected readonly faucetLoading = signal(false);
  protected readonly linkedAddress = computed(() => this.auth.currentUser()?.walletAddress ?? null);
  protected readonly linkedToConnectedWallet = computed(
    () => this.wallet.publicKey() !== null && this.wallet.publicKey() === this.linkedAddress(),
  );
  protected readonly walletMismatch = computed(
    () =>
      this.wallet.publicKey() !== null &&
      this.linkedAddress() !== null &&
      this.wallet.publicKey() !== this.linkedAddress(),
  );
  protected readonly shortConnectedAddress = computed(() => this.shorten(this.wallet.publicKey()));

  protected async connect(): Promise<void> {
    this.busy.set(true);
    try {
      await this.wallet.connect();
    } catch (error) {
      if (!isWalletUserRejection(error)) {
        this.toast.show('Não foi possível conectar a Phantom', { tone: 'error' });
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected async linkWallet(): Promise<void> {
    this.busy.set(true);
    try {
      const address = this.wallet.publicKey() ?? (await this.wallet.connect());
      const challenge = await firstValueFrom(this.auth.createWalletChallenge(address));
      const signature = await this.wallet.signMessage(challenge.message);
      await firstValueFrom(this.auth.verifyWallet(challenge.challengeId, signature));
      this.toast.show('Carteira vinculada', {
        description: 'A assinatura foi verificada sem expor sua chave privada.',
        tone: 'success',
      });
    } catch (error) {
      if (!isWalletUserRejection(error)) {
        this.toast.show('Não foi possível vincular a carteira', { tone: 'error' });
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected async disconnect(): Promise<void> {
    await this.wallet.disconnect();
  }

  protected async requestFaucet(): Promise<void> {
    this.faucetLoading.set(true);
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/dev/faucet`, {}));
      this.toast.show('100 BRLP enviados', { tone: 'success' });
    } finally {
      this.faucetLoading.set(false);
    }
  }

  private shorten(address: string | null): string {
    return address ? `${address.slice(0, 5)}…${address.slice(-5)}` : '';
  }
}
