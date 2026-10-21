# Eventos financeiros

## Mapeamento contábil

| Evento               | Débito                      | Crédito                           | Chave de idempotência       |
| -------------------- | --------------------------- | --------------------------------- | --------------------------- |
| Milestone financiado | `external:<client>`         | `escrow:system`                   | `milestone:<id>:funded`     |
| Milestone liberado   | `escrow:system`             | `freelancer_balance:<freelancer>` | `milestone:<id>:released`   |
| Reembolso            | `escrow:system`             | `external:<client>`               | `milestone:<id>:refunded`   |
| Saque solicitado     | `freelancer_balance:<user>` | `payout_clearing:system`          | `withdrawal:<id>:requested` |
| Saque concluído      | `payout_clearing:system`    | `external:system`                 | `withdrawal:<id>:paid`      |
| Saque revertido      | `payout_clearing:system`    | `freelancer_balance:<user>`       | `withdrawal:<id>:reversed`  |

Todos os valores das duas pernas são idênticos e positivos.

## Milestones

Na confirmação on-chain de `fund`, `release`/`claim` ou `refund`, o serviço:

1. valida ator, transição e evidência Solana;
2. abre uma transação PostgreSQL;
3. grava confirmação e novo status do milestone;
4. publica o evento no ledger;
5. efetiva tudo junto no commit.

Repetir uma confirmação já aplicada garante a existência do lançamento pela mesma chave idempotente.

## Saques

Ao aceitar uma cotação, o total de BRLP da cotação é reservado de `freelancer_balance` para `payout_clearing` na mesma transação que muda `created` para `quoted`.

- `paid`: o clearing é debitado e `external` recebe o crédito.
- `failed`, `expired` ou `cancelled`: o clearing é debitado e o saldo do freelancer é recreditado.
- `submitted` e `processing`: não criam movimento adicional; o valor continua reservado.

O status externo jamais altera dinheiro isoladamente. `applyProviderStatus` atualiza status e registra o evento terminal sob a mesma transação.

## Compensações

Se uma operação econômica precisar ser corrigida depois do commit, crie um evento compensatório explícito com nova chave. Ele deve referenciar o evento original e inverter as direções pelo mesmo valor, ou registrar somente a diferença aprovada. Não reutilize a chave original e não mude registros existentes.
