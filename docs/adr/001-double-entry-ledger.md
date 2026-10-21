# ADR 001: Ledger imutável de partidas dobradas

- Status: aceito
- Data: 2026-10-20

## Contexto

Status de milestones e respostas da PagFinance representam estado operacional, mas não são uma fonte suficiente para saldo, auditoria e reconciliação. Um status pode mudar, uma chamada externa pode ser repetida e uma integração pode ficar temporariamente indisponível.

## Decisão

Adotamos um ledger PostgreSQL de partidas dobradas, com contas, transações e lançamentos imutáveis. Todo evento financeiro gera débitos e créditos de mesmo total em unidades mínimas `bigint`. Cada evento possui chave de idempotência e referência ao agregado de domínio.

Mudanças de status que possuem efeito financeiro e seus lançamentos acontecem na mesma transação de banco. O banco impede alteração/exclusão e valida o balanceamento novamente no commit. Correções usam novas transações compensatórias.

## Consequências

Benefícios:

- saldo reconstruível e independente do estado atual do milestone/provider;
- trilha de auditoria e reconciliação por evento;
- retries seguros por idempotência;
- impossibilidade de persistir apenas uma perna do movimento.

Custos:

- mais linhas e consultas para calcular saldos;
- necessidade de locks ordenados em operações concorrentes;
- novos eventos exigem um mapeamento contábil explícito;
- dados históricos anteriores à adoção precisam de backfill controlado ou abertura de saldo auditada.

## Alternativas rejeitadas

- Derivar saldo apenas do status dos milestones: não representa reservas e reversões de saque com segurança.
- Manter uma coluna mutável de saldo como única fonte: perde a trilha de auditoria e aumenta o risco de divergência.
- Lançamento simples: não oferece a invariância de soma zero nem explicita origem e destino.
