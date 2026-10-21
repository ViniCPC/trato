# Ledger financeiro

## Modelo

O ledger usa partidas dobradas. Cada `LedgerTransaction` identifica um evento imutável e possui dois ou mais `LedgerEntry`. Cada lançamento aponta para uma `LedgerAccount`, uma direção (`debit` ou `credit`) e `amountBaseUnits` positivo.

Contas suportadas:

| Tipo                 | Dono     | Uso                                |
| -------------------- | -------- | ---------------------------------- |
| `external`           | opcional | Origem/destino fora da plataforma  |
| `escrow`             | sistema  | BRLP bloqueado em milestones       |
| `freelancer_balance` | usuário  | Saldo disponível do freelancer     |
| `payout_clearing`    | sistema  | Saques reservados, ainda não pagos |
| `platform_revenue`   | sistema  | Receita futura da plataforma       |

A chave materializada da conta é `<tipo>:<userId|system>:<asset>`. Valores são `bigint` em unidades mínimas no backend e `int8` no PostgreSQL. Respostas HTTP usam strings.

## Garantias

- `idempotencyKey` é única por transação financeira.
- A aplicação rejeita lançamentos não positivos, menos de duas entradas e totais de débito/crédito diferentes.
- O banco repete a validação em trigger de constraint diferida no commit.
- Triggers bloqueiam `UPDATE` e `DELETE` em transações e lançamentos.
- Correções são novas transações compensatórias; não há edição retroativa.
- Contas são bloqueadas com `FOR UPDATE`, em ordem estável, antes da gravação.
- Mudança de status e lançamento financeiro compartilham a mesma transação de banco.

A migration inicial faz backfill idempotente de milestones já `funded`, `submitted`, `released` ou `refunded`, incluindo as duas pernas de cada evento derivável do estado histórico.

## Saldos

Para `freelancer_balance`, saldo disponível é:

```text
soma(créditos) - soma(débitos)
```

A cotação de saque bloqueia a conta, confirma o saldo e registra a reserva atomicamente. A taxa retornada pelo provider integra o total reservado.

O extrato autenticado é exposto em:

```http
GET /ledger/me?limit=20&cursor=<cursor-opcional>
```

Resposta:

```json
{
  "balanceBaseUnits": "97500000",
  "items": [
    {
      "id": "edff2fc8-4144-47d5-a0e9-4e7e1f3349a5",
      "direction": "debit",
      "amountBaseUnits": "102500000",
      "createdAt": "2026-10-20T23:10:00.000Z",
      "transaction": {
        "eventType": "withdrawal_requested",
        "referenceType": "withdrawal",
        "referenceId": "c141c742-157f-45cf-a695-ab2f62f75ef4"
      }
    }
  ],
  "nextCursor": null
}
```

O cursor combina `createdAt` e `id`; `limit` aceita 1 a 100 e o padrão é 20.

## Operação

Nunca execute manutenção que atualize ou apague `ledger_transactions` ou `ledger_entries`. Uma reconciliação deve comparar eventos de domínio, assinaturas e referências externas com `referenceType/referenceId`. Ajustes aprovados ganham novo `eventType`, nova chave de idempotência e lançamentos invertidos ou complementares.
