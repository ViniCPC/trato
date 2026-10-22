# Trato

MVP de contratos por etapas entre clientes e freelancers. Valores monetários usam BRLP com 6 casas decimais e sempre atravessam o sistema como inteiros (`bigint`/strings), sem ponto flutuante.

## Componentes

- `frontend/`: Angular 20 standalone, signals, rotas lazy e Tailwind CSS v4.
- `backend/`: NestJS 11, Prisma ORM 8 e PostgreSQL.
- `programs/trato-escrow/`: programa Anchor com escrow SPL por etapa.
- `packages/trato-client/`: IDL, tipos gerados, PDA e discriminators compartilhados.
- `scripts/setup-devnet.ts`: setup idempotente do mint BRLP-dev, ATAs e saldos de teste.

O frontend nunca monta instruções Solana. A API prepara a transação, a Phantom apenas assina e envia, e a API confirma os efeitos on-chain antes de atualizar o PostgreSQL:

`prepare → Phantom signAndSendTransaction → confirm → reload do projeto`

## Desenvolvimento local

Requisitos: Node 24+, Docker, Rust/Solana/Anchor para o programa.

1. Execute `docker compose up -d db`.
2. Copie `backend/.env.example` para `backend/.env` e defina `DATABASE_URL` e `JWT_SECRET`.
3. Em `backend/`, rode `npm install`, `npx prisma db migrate --yes`, `npm run seed` e `npm run start:dev`.
4. Em `frontend/`, rode `npm install` e `npm start`. No PowerShell que bloqueia
   `npm.ps1`, use `npm.cmd start`.
5. Abra `http://localhost:4200`; Swagger fica em `http://localhost:3000/docs`.

Depois de instalar as dependências, o frontend também pode ser iniciado na raiz
do repositório com `npm start` (ou `npm.cmd start` no PowerShell com essa restrição).

O driver padrão `ESCROW_DRIVER=mock` não exige RPC ou carteira e mantém o fluxo de demonstração. As contas do seed são `cliente@trato.dev` e `freelancer@trato.dev`, ambas com senha `trato123`.

## Programa e testes

O PDA usa `[b"escrow", client, milestone_id]`; cada vault é uma ATA cuja autoridade é o próprio PDA. O programa aceita Token Program clássico ou Token-2022 por `token_interface` e implementa:

- `fund`: cliente cria o escrow e transfere o valor exato;
- `mark_submitted`: somente o freelancer, partindo de `Funded`;
- `release`: somente o cliente, em `Funded` ou `Submitted`, transfere ao freelancer e fecha vault/escrow;
- `refund`: somente o cliente e apenas em `Funded`, devolve e fecha as contas.

Rode `cargo test -p trato-escrow` em um ambiente que permita carregar proc-macros Rust. Os testes LiteSVM cobrem o ciclo feliz, liberação antecipada, fechamento e restituição de rent, mint divergente, ator indevido, valor zero, dupla entrega e reembolso após entrega.

O build SBF/verificável pode ser reproduzido no Windows sem depender do caminho do OneDrive:

```powershell
./scripts/verified-build.ps1
```

A imagem usada é `solanafoundation/anchor:v1.0.2`, fixada à versão de `Anchor.toml`.

## Devnet

O endereço esperado do programa é `5jqtbGSBvTACNYzjeWFsRnXLYFwZDMZ9qjV8Spt4jgqn`. O arquivo `target/deploy/trato_escrow-keypair.json` é segredo operacional ignorado pelo Git; guarde um backup seguro antes do primeiro deploy.

1. Copie `.env.solana.example` para `.env.solana` e carregue as variáveis no terminal.
2. Compile com `anchor build --ignore-keys`.
3. Financie a autoridade com SOL de devnet.
4. Faça o deploy:

```powershell
solana program deploy target/deploy/trato_escrow.so --program-id target/deploy/trato_escrow-keypair.json --keypair $env:DEPLOYER_KEYPAIR --url $env:SOLANA_RPC_URL
```

5. Crie/configure BRLP-dev e as carteiras de teste:

```powershell
npm run setup:devnet
```

O script cria um mint de 6 casas quando necessário, cria ATAs ausentes, completa
cada carteira até `BRLP_TEST_BALANCE` e inicializa/atualiza a config on-chain com
`FREELANCER_WALLET`, `ESCROW_MAX_AMOUNT` e `CLAIM_DELAY_SECONDS`. O resultado local
fica em `.devnet/trato.json`; copie o mint para `SOLANA_TOKEN_MINT` no backend.
Reexecutar o script não cria outro mint nem duplica o saldo alvo. O ensaio completo
está em [`docs/runbooks/devnet-e2e.md`](docs/runbooks/devnet-e2e.md).

Para usar a rede, configure `ESCROW_DRIVER=solana`, `SOLANA_RPC_URL`, `SOLANA_PROGRAM_ID` e `SOLANA_TOKEN_MINT`. O backend falha no boot se a configuração Solana estiver incompleta. `/dev/faucet` existe somente fora de produção, tem limite de uma chamada por minuto por usuário e usa `FAUCET_AUTHORITY_SECRET`.

## Carteira e segurança

A vinculação usa challenge-response: o backend gera uma mensagem com usuário, carteira, nonce e expiração de cinco minutos; a Phantom assina; o backend valida Ed25519 e aceita o desafio uma única vez. Em produção com múltiplas réplicas, mova o armazenamento efêmero de challenges para Redis ou PostgreSQL.

O MVP persiste o JWT no `localStorage`. É um trade-off consciente: o token fica acessível em caso de XSS. A evolução recomendada é cookie `httpOnly`, `secure` e `sameSite`, com proteção CSRF. Nunca versione keypairs, secrets de faucet ou arquivos `.env`.

## Qualidade

- Cliente compartilhado: `npm --prefix packages/trato-client test`.
- Frontend: `npm run build` e `npm test -- --watch=false --browsers=ChromeHeadless` em `frontend/`.
- Backend: `npm run build` e `npm test -- --runInBand` em `backend/`.
- Programa: `cargo test -p trato-escrow` e `anchor build --ignore-keys`.

Na raiz, `npm test` executa Jest, os testes `node --test`, o cliente compartilhado
e o frontend em ChromeHeadless.

O Docker da API usa o contexto da raiz para incluir `packages/trato-client`. Antes de `docker compose up --build`, defina `JWT_SECRET` com pelo menos 32 bytes.
