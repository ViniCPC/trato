# Trato API

## Escrow

O provider é escolhido por `ESCROW_DRIVER=mock|solana` através do token de DI `ESCROW_PROVIDER`.

Com Bearer JWT:

- `POST /milestones/:id/{fund|submit|release|refund}/prepare` monta a transação;
- `POST /milestones/:id/{fund|submit|release|refund}/confirm` recebe `{ "signature": "..." }`;
- `POST /me/wallet/challenge` recebe `{ "walletAddress": "..." }`;
- `POST /me/wallet/verify` recebe o ID do desafio e a assinatura Base58;
- `POST /dev/faucet` existe apenas quando `NODE_ENV != production`.

A confirmação consulta a transação no RPC com retries, exige `meta.err === null`, signer correto, program ID e discriminator esperados, e valida cliente, freelancer, mint, UUID, valor e status diretamente na conta Anchor. Em `release`/`refund`, confirma que o escrow foi fechado. A atualização usa o status anterior no `WHERE`, impedindo duas confirmações concorrentes, e assinaturas são únicas e idempotentes.

O programa permite `pending → funded → submitted → released`, liberação antecipada `funded → released` e `funded → refunded`.

## Configuração

Copie `.env.example`. `DATABASE_URL` e `JWT_SECRET` são sempre obrigatórios. Quando o driver é `solana`, também são obrigatórios:

- `SOLANA_RPC_URL`
- `SOLANA_PROGRAM_ID`
- `SOLANA_TOKEN_MINT`

O processo encerra no boot com uma mensagem legível se a configuração estiver incompleta. Swagger: `/docs`; JSON: `/docs-json`.
