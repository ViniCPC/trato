import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { User } from '../../../core/models/user.model';
import { ToastService } from '../../../core/services/toast.service';
import { WalletService } from '../../../core/wallet/wallet.service';
import {
  ConfirmedEscrowTransaction,
  PreparedEscrowTransaction,
  ProjectMilestone,
} from '../models/project.model';
import { ProjectsApiService } from './projects-api.service';
import { TransactionFlowService } from './transaction-flow.service';

const WALLET = '11111111111111111111111111111111';
const milestone: ProjectMilestone = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  projectId: '550e8400-e29b-41d4-a716-446655440001',
  sequence: 1,
  title: 'Entrega',
  description: null,
  amountBaseUnits: '1000000',
  status: 'pending',
  escrowAddress: null,
  fundTxSignature: null,
  submitTxSignature: null,
  releaseTxSignature: null,
  refundTxSignature: null,
  fundedAt: null,
  submittedAt: null,
  releasedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const confirmed: ConfirmedEscrowTransaction = {
  ...milestone,
  status: 'funded',
  fundTxSignature: 'signature',
  signature: 'signature',
};

describe('TransactionFlowService', () => {
  let service: TransactionFlowService;
  let api: jasmine.SpyObj<ProjectsApiService>;
  let wallet: jasmine.SpyObj<WalletService> & {
    publicKey: ReturnType<typeof signal<string | null>>;
  };
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ProjectsApiService>('ProjectsApiService', [
      'prepareMilestoneAction',
      'confirmMilestoneAction',
    ]);
    wallet = Object.assign(
      jasmine.createSpyObj<WalletService>('WalletService', ['connect', 'signAndSendTransaction']),
      { publicKey: signal<string | null>(WALLET) },
    );
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    const user: User = {
      id: 'user',
      name: 'Cliente',
      email: 'cliente@trato.dev',
      walletAddress: WALLET,
      createdAt: '',
      updatedAt: '',
    };

    TestBed.configureTestingModule({
      providers: [
        TransactionFlowService,
        { provide: ProjectsApiService, useValue: api },
        { provide: WalletService, useValue: wallet },
        { provide: ToastService, useValue: toast },
        { provide: AuthService, useValue: { currentUser: signal<User | null>(user) } },
      ],
    });
    service = TestBed.inject(TransactionFlowService);
  });

  it('confirma o driver mock sem pedir assinatura à Phantom', async () => {
    const prepared: PreparedEscrowTransaction = {
      driver: 'mock',
      transactionBase64: null,
      mockSignature: 'mock_signature',
      escrowAddress: 'mock_escrow',
      lastValidBlockHeight: null,
    };
    api.prepareMilestoneAction.and.returnValue(of(prepared));
    api.confirmMilestoneAction.and.returnValue(of(confirmed));

    await expectAsync(service.execute(milestone, 'fund')).toBeResolvedTo(confirmed);
    expect(wallet.signAndSendTransaction).not.toHaveBeenCalled();
    expect(service.step()).toBe('done');
  });

  it('assina a transação preparada e só então confirma', async () => {
    api.prepareMilestoneAction.and.returnValue(
      of({
        driver: 'solana',
        transactionBase64: 'dHJhbnNhY3Rpb24=',
        mockSignature: null,
        escrowAddress: 'escrow',
        lastValidBlockHeight: '10',
      }),
    );
    wallet.signAndSendTransaction.and.resolveTo('signature');
    api.confirmMilestoneAction.and.returnValue(of(confirmed));

    await service.execute(milestone, 'fund');
    expect(wallet.signAndSendTransaction).toHaveBeenCalledOnceWith('dHJhbnNhY3Rpb24=');
    expect(api.confirmMilestoneAction).toHaveBeenCalledOnceWith(milestone.id, 'fund', 'signature');
  });

  it('bloqueia uma carteira conectada diferente da vinculada', async () => {
    wallet.publicKey.set('Vote111111111111111111111111111111111111111');
    api.prepareMilestoneAction.and.returnValue(
      of({
        driver: 'solana',
        transactionBase64: 'dHJhbnNhY3Rpb24=',
        mockSignature: null,
        escrowAddress: 'escrow',
        lastValidBlockHeight: '10',
      }),
    );

    await expectAsync(service.execute(milestone, 'fund')).toBeRejected();
    expect(wallet.signAndSendTransaction).not.toHaveBeenCalled();
    expect(toast.show).toHaveBeenCalledWith('Carteira incorreta', jasmine.any(Object));
  });
});
