import { WithdrawalStatus } from '../models/finance.model';

export const WITHDRAWAL_STATUS_CONFIG: Record<
  WithdrawalStatus,
  { label: string; classes: string; description: string }
> = {
  created: {
    label: 'Criado',
    classes: 'bg-ink-100 text-ink-700',
    description: 'O pedido foi criado e aguarda cotação.',
  },
  quoted: {
    label: 'Cotado',
    classes: 'bg-amber-50 text-amber-800',
    description: 'A cotação está pronta para confirmação.',
  },
  awaiting_signature: {
    label: 'Aguardando assinatura',
    classes: 'bg-web3-50 text-web3-700',
    description: 'Confirme a transação na sua carteira.',
  },
  submitted: {
    label: 'Enviado',
    classes: 'bg-sky-50 text-sky-700',
    description: 'A transferência foi enviada e será processada.',
  },
  processing: {
    label: 'Processando',
    classes: 'bg-sky-50 text-sky-700',
    description: 'A PagFinance está processando o Pix.',
  },
  paid: {
    label: 'Pago',
    classes: 'bg-brand-50 text-brand-800',
    description: 'O saque foi concluído.',
  },
  failed: {
    label: 'Falhou',
    classes: 'bg-rose-50 text-rose-700',
    description: 'O saque não pôde ser concluído e o saldo foi devolvido.',
  },
  expired: {
    label: 'Expirado',
    classes: 'bg-amber-50 text-amber-800',
    description: 'A cotação expirou e o saldo foi devolvido.',
  },
  cancelled: {
    label: 'Cancelado',
    classes: 'bg-ink-100 text-ink-700',
    description: 'O saque foi cancelado e o saldo foi devolvido.',
  },
};
