# Fluxo de saque

Todos os endpoints exigem `Authorization: Bearer <jwt>`. O usuário é sempre obtido do JWT; `userId` não é aceito no body.

## Estados

```text
created -> quoted -> awaiting_signature -> submitted -> processing -> paid
    |         |               |               |            |
    +---------+---------------+---------------+------------+-> failed
              +---------------+-----------------------------> expired
              +---------------+---------------+------------> cancelled
```

Estados terminais: `paid`, `failed`, `expired` e `cancelled`. Transições inválidas retornam conflito e não alteram o ledger.

## 1. Cotar e reservar saldo

```http
POST /withdrawals/quote
Authorization: Bearer <jwt>
Idempotency-Key: wd-2026-10-20-0001
Content-Type: application/json

{
  "amountBaseUnits": "100000000",
  "pixKey": "freelancer@example.com"
}
```

Resposta resumida:

```json
{
  "id": "c141c742-157f-45cf-a695-ab2f62f75ef4",
  "status": "quoted",
  "amountBaseUnits": "102500000",
  "feeBaseUnits": "2500000",
  "fiatAmountMinor": "10000",
  "asset": "BRLP",
  "fiatCurrency": "BRL",
  "providerQuoteReference": "quote_123",
  "quoteExpiresAt": "2026-10-20T23:30:00.000Z"
}
```

`amountBaseUnits` da resposta é o total reservado, inclusive taxa informada na cotação. Na mesma transação do banco, o ledger debita `freelancer_balance` e credita `payout_clearing`.

## 2. Preparar a transação

```http
POST /withdrawals/c141c742-157f-45cf-a695-ab2f62f75ef4/prepare
Authorization: Bearer <jwt>
```

```json
{
  "withdrawal": {
    "id": "c141c742-157f-45cf-a695-ab2f62f75ef4",
    "status": "awaiting_signature",
    "providerReference": "intent_123"
  },
  "transactionBase64": "AQAAAA...",
  "mockSignature": null,
  "lastValidBlockHeight": "321000000"
}
```

No provider mock, `transactionBase64` é `null` e `mockSignature` deve ser enviado na confirmação. No provider real, desserialize, assine e envie `transactionBase64` pela carteira do freelancer.

## 3. Confirmar a assinatura

```http
POST /withdrawals/c141c742-157f-45cf-a695-ab2f62f75ef4/confirm
Authorization: Bearer <jwt>
Content-Type: application/json

{ "signature": "<assinatura-base58>" }
```

A confirmação real consulta a transação Solana e valida sucesso, signer, token program, mint BRLP, contas associadas, valor e memo. Uma transação ausente ou ainda não confirmada produz erro temporário; uma transação divergente é rejeitada.

## 4. Sincronizar manualmente

```http
POST /withdrawals/c141c742-157f-45cf-a695-ab2f62f75ef4/sync
Authorization: Bearer <jwt>
```

Repita com backoff até estado terminal. `PENDING/SUBMITTED`, `PROCESSING` e `COMPLETED` da PagFinance são normalizados para `submitted`, `processing` e `paid`. Falha, expiração ou cancelamento revertem a reserva no ledger; `paid` move `payout_clearing` para `external`.

## Consultas

```http
GET /withdrawals?limit=20&cursor=<cursor-opcional>
GET /withdrawals/c141c742-157f-45cf-a695-ab2f62f75ef4
```

A listagem é paginada por cursor e retorna `nextCursor`. Consultar ou alterar o saque de outro usuário retorna `403`, mesmo conhecendo o UUID.

## Idempotência e concorrência

- Repetir a cotação com o mesmo `Idempotency-Key` e usuário retorna o mesmo saque.
- Reutilizar a chave com outro valor ou outra chave Pix retorna conflito.
- Um registro ainda `created` é retomado com a mesma chave após interrupção do processo.
- A chave é única por usuário e tem de possuir 8 a 128 caracteres ASCII visíveis.
- Confirmação repetida com a mesma assinatura em estado já submetido é idempotente.
- Alterações usam status anterior no `WHERE`; uma corrida não aplica duas transições.
- Cada efeito no ledger tem sua própria chave determinística.
