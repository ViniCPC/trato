# Trato API

## Escrow

O provider é escolhido por `ESCROW_DRIVER=mock|solana` através do token de DI `ESCROW_PROVIDER`.

Com Bearer JWT:

- `POST /milestones/:id/{fund|submit|release|refund|claim}/prepare` monta a transação;
- `POST /milestones/:id/{fund|submit|release|refund|claim}/confirm` recebe `{ "signature": "..." }`;
- `POST /milestones/:id/sync` consulta a PDA e as transações on-chain para atualizar uma etapa `funded` ou `submitted` após uma ação feita fora do site;
- `GET /escrow/rules` expõe o teto, prazo, mint e pausa lidos da config on-chain;
- `POST /me/wallet/challenge` recebe `{ "walletAddress": "..." }`;
- `POST /me/wallet/verify` recebe o ID do desafio e a assinatura Base58;
- `POST /dev/faucet` existe apenas quando `NODE_ENV != production`.

A confirmação consulta a transação no RPC com retries, exige `meta.err === null`, signer correto, program ID e discriminator esperados, e valida cliente, freelancer, mint, UUID, valor e status diretamente na conta Anchor. Em `release`/`refund`, confirma que o escrow foi fechado. A atualização usa o status anterior no `WHERE`, impedindo duas confirmações concorrentes, e assinaturas são únicas e idempotentes.

O programa permite `pending → funded → submitted → released`, liberação antecipada `funded → released`, reembolso `funded → refunded` e `submitted → released` por `claim` após o prazo on-chain. O prazo é gravado na etapa no depósito e começa na entrega on-chain. O escrow paga ao freelancer apenas o valor acordado e devolve qualquer excedente do vault ao cliente.

Cada confirmação exige que a instrução use a PDA da própria etapa. Em `release`, o crédito na conta de token do freelancer deve ser exatamente o valor acordado. O `prepare` de `submit` verifica que o escrow ainda existe e está financiado. A troca de carteira é bloqueada enquanto o usuário participar de uma etapa `funded` ou `submitted`.

O endpoint `sync` usa a mesma validação de `confirm` antes de gravar uma transição. Ele é limitado a 20 varreduras por usuário por minuto e a uma varredura por etapa a cada 30 segundos, por processo. Em implantação com várias réplicas, aplique também um limitador compartilhado no gateway. Se o RPC não fornecer o histórico da PDA, a atualização não é feita; nesse caso, confirme usando a assinatura da transação. O front chama `sync` ao abrir um projeto com etapas financiadas ou entregues.

O provider lê o token program do mint, aceita transações legadas e v0 (`maxSupportedTransactionVersion: 0`) e usa compromisso `finalized` quando `SOLANA_CLUSTER=mainnet-beta`.

## Configuração on-chain e deploy

O `fund` exige uma PDA `config` inicializada pela *upgrade authority* do programa, com carteira fixa do freelancer, mint aceito, teto por etapa e prazo de saque. Só novos depósitos são afetados por uma atualização do teto, prazo ou pausa; o mint e o freelancer são imutáveis nessa config. A página pública `/regras` mostra os valores on-chain. Não financie com clientes enquanto a config não corresponder à carteira e ao mint pretendidos.

Esta versão aumenta o tamanho da conta `Escrow` de 130 para 146 bytes. Antes de atualizar um programa já implantado, confirme que não há escrows antigos com fundos ou faça uma migração auditada. Teste em devnet o fluxo completo, inclusive uma transferência extra de 1 unidade de token ao vault antes de `release`, `refund` e `claim`. Não use a autoridade de upgrade da mainnet na máquina cotidiana.

Depois de financiar uma carteira **de teste** na devnet, execute a partir da raiz do repositório:

```powershell
anchor build
anchor deploy --provider.cluster devnet --provider.wallet .devnet/payer.json
node backend/scripts/configure-devnet.mjs --operation initialize --keypair .devnet/payer.json --admin <ADMIN_PUBKEY> --freelancer <FREELANCER_PUBKEY> --mint <MINT_PUBKEY> --max-amount <UNIDADES_BASE> --delay-seconds 604800
```

O `--keypair` de inicialização deve ser a *upgrade authority* do programa. `--admin` será a carteira que poderá alterar teto, prazo e pausa depois; para isso, use `--operation update --keypair <ADMIN_KEYPAIR> --max-amount ... --delay-seconds ... --paused true|false`. O script recusa RPC diferente do público da devnet. Nunca inclua arquivos de chave no Git. A pasta `.devnet/` está ignorada.

## Configuração

Copie `.env.example`. `DATABASE_URL` e `JWT_SECRET` são sempre obrigatórios. Quando o driver é `solana`, também são obrigatórios:

- `SOLANA_RPC_URL`
- `SOLANA_PROGRAM_ID`
- `SOLANA_TOKEN_MINT`

O processo encerra no boot com uma mensagem legível se a configuração estiver incompleta. Swagger: `/docs`; JSON: `/docs-json`.
