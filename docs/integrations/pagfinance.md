# Integração PagFinance

## Escopo

O backend usa a API Cash-out da PagFinance para cotar BRLP em BRL, criar uma intenção de pagamento Pix e obter os dados da transferência Solana. A carteira do freelancer assina e envia a transação; o backend valida a evidência on-chain antes de registrar a submissão.

Os tokens JWT emitidos pela PagFinance existem apenas em memória durante a requisição. O banco guarda somente `providerQuoteReference`, `providerReference` e `txSignature`.

## Configuração

```dotenv
PAYOUT_DRIVER=pagfinance
PAGFINANCE_BASE_URL=https://sandbox.brlp.io/api/v1
PAGFINANCE_API_TOKEN=<partner-api-key>
PAGFINANCE_BRLP_ASSET_ID=<id retornado pelo catálogo de assets>
PAGFINANCE_APP_NAME=trato
PAGFINANCE_APP_DOMAIN=app.trato.example
PAGFINANCE_APP_VERSION=1.0.0
PAGFINANCE_TIMEOUT_MS=10000
SOLANA_RPC_URL=<rpc do mesmo cluster usado pela PagFinance>
SOLANA_TOKEN_MINT=<mint BRLP do ambiente>
```

- `PAGFINANCE_API_TOKEN` é a API key do parceiro usada em `POST /auth/token`.
- `PAGFINANCE_BRLP_ASSET_ID` deve vir do catálogo do ambiente; não copie o ID entre sandbox e produção.
- `PAGFINANCE_BASE_URL` deve incluir `/api/v1` e não terminar em `/`.
- O RPC e o mint precisam pertencer ao mesmo cluster da intenção retornada.
- O timeout aceito pela aplicação é de 100 a 30.000 ms; o padrão é 10.000 ms.

Sandbox usa `https://sandbox.brlp.io/api/v1`. Para produção, use a URL, API key, asset ID, mint e RPC fornecidos no onboarding da PagFinance. Nunca reutilize credenciais ou identificadores do sandbox.

## Fluxo externo

1. A API emite um JWT curto por usuário com `POST /auth/token`, usando o ID autenticado como `uid` e sua carteira como `pubkey`.
2. `POST /cashout/quote` recebe asset, valor decimal exato, sender, chave Pix, moeda e ID externo.
3. `POST /cashout/intent` converte a cotação em uma intenção idempotente e retorna receiver, amount, memo e expiração.
4. O backend monta um `TransferChecked` SPL para o receiver, com o memo exato. A ATA do receiver é criada idempotentemente quando não existe.
5. Em `/confirm`, o backend exige transação confirmada, signer esperado, mint, token program, ATAs, valor e memo exatos.
6. `GET /cashout/intent/:id` alimenta a sincronização de status.

Valores financeiros são convertidos diretamente entre texto decimal e `bigint`; nenhum valor monetário passa por `number` na aplicação. Quando a API externa envia números JSON, o parser os transforma em texto antes do `JSON.parse`.

## Trocar mock pelo provider real

1. Mantenha `PAYOUT_DRIVER=mock` no desenvolvimento local e valide o fluxo completo.
2. Cadastre as credenciais do ambiente como secrets do deploy.
3. Configure RPC, mint e asset ID correspondentes.
4. Altere somente `PAYOUT_DRIVER=pagfinance` e reinicie a API. O processo falha no boot se faltar uma variável obrigatória.
5. Faça um saque mínimo em sandbox, assine a transação e acompanhe `/withdrawals/:id/sync` até `paid`.

O provider é selecionado pelo token `PAYOUT_PROVIDER`; controllers e regra de negócio não conhecem detalhes HTTP da PagFinance.

## Segurança operacional

- Não envie `userId` nos endpoints públicos; ele sempre vem do JWT da Trato.
- Não registre Authorization, API keys, JWTs de usuário, transações serializadas ou chaves Pix em logs.
- Não aceite como confirmação apenas uma assinatura existente: valide todo o conteúdo da transação.
- Use `Idempotency-Key` no endpoint de cotação. O backend também envia chaves determinísticas à PagFinance.
- Consulte o catálogo de assets e a documentação oficial antes de uma virada de ambiente.

Referências: [visão geral da API](https://docs.pag.finance/en/api-reference/overview), [emissão de token](https://docs.pag.finance/en/api-reference/endpoints/auth-token), [cotação de cash-out](https://docs.pag.finance/en/api-reference/endpoints/cashout-quote), [criação da intenção](https://docs.pag.finance/en/api-reference/endpoints/cashout-intent) e [liquidação cripto](https://docs.pag.finance/en/api-reference/crypto-settlement).
