import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/user.model';

const TOKEN_KEY = 'trato.accessToken';

export interface WalletChallenge {
  challengeId: string;
  message: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUserState = signal<User | null>(null);
  private readonly tokenState = signal<string | null>(this.readStoredToken());

  readonly currentUser = this.currentUserState.asReadonly();
  readonly token = this.tokenState.asReadonly();
  readonly isAuthenticated = computed(
    () => this.tokenState() !== null && this.currentUserState() !== null,
  );

  login(request: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap((response) => this.setSession(response)),
      map((response) => response.user),
    );
  }

  register(request: RegisterRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, request).pipe(
      tap((response) => this.setSession(response)),
      map((response) => response.user),
    );
  }

  async restoreSession(): Promise<void> {
    if (!this.tokenState()) {
      return;
    }

    await firstValueFrom(
      this.http.get<User>(`${environment.apiUrl}/me`).pipe(
        tap((user) => this.currentUserState.set(user)),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        map(() => undefined),
      ),
    );
  }

  logout(): void {
    this.clearSession();
  }

  createWalletChallenge(walletAddress: string): Observable<WalletChallenge> {
    return this.http.post<WalletChallenge>(`${environment.apiUrl}/me/wallet/challenge`, {
      walletAddress,
    });
  }

  verifyWallet(challengeId: string, signature: string): Observable<User> {
    return this.http
      .post<User>(`${environment.apiUrl}/me/wallet/verify`, { challengeId, signature })
      .pipe(tap((user) => this.currentUserState.set(user)));
  }

  clearSession(): void {
    this.currentUserState.set(null);
    this.tokenState.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  private setSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    this.tokenState.set(response.accessToken);
    this.currentUserState.set(response.user);
  }

  private readStoredToken(): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  }
}
