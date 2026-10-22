import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  LedgerResponse,
  PreparedWithdrawal,
  Withdrawal,
  WithdrawalListResponse,
} from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly http = inject(HttpClient);

  getLedger(options: { limit: number; cursor?: string }): Observable<LedgerResponse> {
    return this.http.get<LedgerResponse>(`${environment.apiUrl}/ledger/me`, {
      params: this.cursorParams(options),
    });
  }

  quote(
    request: { amountBaseUnits: string; pixKey: string },
    idempotencyKey: string,
  ): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${environment.apiUrl}/withdrawals/quote`, request, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }

  prepare(withdrawalId: string): Observable<PreparedWithdrawal> {
    return this.http.post<PreparedWithdrawal>(
      `${environment.apiUrl}/withdrawals/${withdrawalId}/prepare`,
      {},
    );
  }

  confirm(withdrawalId: string, signature: string): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${environment.apiUrl}/withdrawals/${withdrawalId}/confirm`, {
      signature,
    });
  }

  sync(withdrawalId: string): Observable<Withdrawal> {
    return this.http.post<Withdrawal>(`${environment.apiUrl}/withdrawals/${withdrawalId}/sync`, {});
  }

  getWithdrawal(withdrawalId: string): Observable<Withdrawal> {
    return this.http.get<Withdrawal>(`${environment.apiUrl}/withdrawals/${withdrawalId}`);
  }

  listWithdrawals(options: { limit: number; cursor?: string }): Observable<WithdrawalListResponse> {
    return this.http.get<WithdrawalListResponse>(`${environment.apiUrl}/withdrawals`, {
      params: this.cursorParams(options),
    });
  }

  private cursorParams(options: { limit: number; cursor?: string }): HttpParams {
    let params = new HttpParams().set('limit', options.limit);
    if (options.cursor) params = params.set('cursor', options.cursor);
    return params;
  }
}
