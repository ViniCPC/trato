# Runbook de erros da PagFinance

## Triagem

1. Localize o saque por ID e confira `status`, `provider`, `providerQuoteReference`, `providerReference`, `txSignature`, `failureCode` e timestamps.
2. Confirme que o ambiente usa o base URL, API key, asset ID, mint e RPC do mesmo ambiente.
3. Consulte `POST /withdrawals/:id/sync` com o JWT do dono. Não altere status diretamente no banco.
4. Se houver assinatura, verifique-a no explorer/RPC do cluster correto e compare signer, mint, destino, valor e memo.
5. Antes de uma nova tentativa, determine se o erro é temporário. Não crie outro saque enquanto uma intenção anterior ainda puder liquidar.

## Erros internos controlados

| Código                        | Interpretação                            | Ação                                                                 |
| ----------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| `PAGFINANCE_NOT_CONFIGURED`   | Configuração incompleta                  | Corrigir secrets/variáveis e reiniciar                               |
| `PAGFINANCE_TIMEOUT`          | Timeout HTTP                             | Repetir `sync` com backoff; verificar latência e status do provider  |
| `PAGFINANCE_UNAVAILABLE`      | Rede/DNS/TLS indisponível                | Verificar conectividade e status externo                             |
| `PAGFINANCE_HTTP_429`         | Rate limit                               | Respeitar backoff e reduzir polling                                  |
| `PAGFINANCE_INVALID_RESPONSE` | Contrato externo inesperado              | Preservar IDs, capturar resposta sanitizada e escalar                |
| `PAGFINANCE_UNKNOWN_STATUS`   | Novo status não mapeado                  | Não forçar estado; atualizar o mapeamento após confirmar a semântica |
| `PAGFINANCE_INTENT_EXPIRED`   | Intenção retornada expirada              | Sincronizar; o saldo será revertido ao atingir `expired`             |
| `SOLANA_TRANSACTION_PENDING`  | Assinatura ainda não indexada/confirmada | Repetir `/confirm` depois de alguns segundos                         |
| `SOLANA_INVALID_SIGNATURE`    | Assinatura não é Base58 com 64 bytes     | Corrigir o cliente; não repetir no RPC                               |
| `SOLANA_RPC_UNAVAILABLE`      | RPC não respondeu                        | Trocar/fixar o RPC do cluster e repetir                              |
| `SOLANA_TRANSACTION_FAILED`   | `meta.err` on-chain                      | Não reutilizar a assinatura; sincronizar a intenção                  |
| `SOLANA_WRONG_SIGNER`         | Outra carteira assinou                   | Rejeitar e investigar o cliente                                      |
| `SOLANA_TRANSACTION_MISMATCH` | Valor, mint, ATA ou memo divergente      | Rejeitar; nunca marcar manualmente como submetido                    |

Códigos funcionais da PagFinance, como chave Pix inválida, são preservados em `failureCode` quando o provider os fornece. Mensagens externas viram exceções controladas; credenciais nunca devem aparecer na resposta ou nos logs.

## Sincronização manual

```bash
curl -X POST \
  -H "Authorization: Bearer $TRATO_JWT" \
  http://localhost:3000/withdrawals/<withdrawal-id>/sync
```

- `quoted`/`awaiting_signature` com cotação expirada: a API marca `expired` e devolve o valor ao saldo.
- `submitted`/`processing`: a API consulta a intenção e aplica somente uma transição válida.
- Estado terminal: a operação é somente leitura e idempotente.
- Ausência de `providerReference`: não há intenção externa para sincronizar; investigue a preparação.

## Reconciliação

Compare diariamente saques não terminais locais com as intenções da PagFinance. Para cada `providerReference`, confirme:

- status externo e local compatíveis;
- assinatura, quando existente;
- uma transação `withdrawal_requested` no ledger;
- exatamente uma `withdrawal_paid` ou `withdrawal_reversed` para estados terminais.

Corrija diferenças financeiras com transações compensatórias aprovadas; nunca edite ou apague lançamentos. Se o provider indicar pagamento e o ledger não tiver a conclusão, execute `sync`. Se persistir, interrompa novos saques e investigue antes de qualquer ajuste.

## Incidente com credencial

Revogue e rotacione a API key no provider, atualize o secret do deploy e reinicie as réplicas. Procure exposição em logs sem copiar o token para tickets. JWTs de usuário PagFinance expiram em 15 minutos e não são persistidos, mas a API key do parceiro deve ser tratada como segredo de longa duração.
