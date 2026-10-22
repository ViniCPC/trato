# Ensaio completo na devnet

Este roteiro valida o programa de escrow, a sincronização do backend e o saque com
`PAYOUT_DRIVER=mock`. Ele usa duas carteiras: a autoridade/freelancer e um cliente.
Todos os valores são de teste.

## Pré-requisitos

- Node.js 24+, Rust 1.89+, Solana CLI 3.1+, Anchor CLI 1.0.2 e `spl-token` 5.5+.
- PostgreSQL acessível pelo backend.
- Phantom em devnet ou os keypairs locais equivalentes.
- SOL de devnet nas duas carteiras.
- O keypair do programa guardado fora do Git. Nunca use uma chave de mainnet.

Instale e valide o código antes de tocar na rede:

```powershell
npm ci
npm run format
npm run lint
npm run build
npm test
cargo test -p trato-escrow
anchor build
```

O endereço de `target/deploy/trato_escrow-keypair.json` precisa ser idêntico ao
`declare_id!` e aos endereços de `Anchor.toml` e `packages/trato-client/idl`:

```powershell
$programId = solana-keygen pubkey target/deploy/trato_escrow-keypair.json
$programId
rg $programId Anchor.toml programs/trato-escrow/src/lib.rs packages/trato-client
```

Se não coincidir, restaure o keypair operacional correto. Não execute `anchor keys
sync` sobre um programa já publicado: isso troca o endereço usado pelo código.

## 1. Preparar as carteiras e o ambiente

Crie uma carteira de cliente somente se ainda não houver uma:

```powershell
solana-keygen new --no-bip39-passphrase --outfile .devnet/client.json
$env:SOLANA_RPC_URL = 'https://api.devnet.solana.com'
$env:DEPLOYER_KEYPAIR = (Resolve-Path .devnet/payer.json).Path
$env:SOLANA_PROGRAM_ID = solana-keygen pubkey target/deploy/trato_escrow-keypair.json
$env:FREELANCER_WALLET = solana-keygen pubkey $env:DEPLOYER_KEYPAIR
$env:TEST_WALLETS = solana-keygen pubkey .devnet/client.json
$env:ESCROW_MAX_AMOUNT = '1000'
$env:CLAIM_DELAY_SECONDS = '300'
$env:BRLP_TEST_BALANCE = '100'
```

Confira o cluster e os saldos sem imprimir o conteúdo dos keypairs:

```powershell
solana balance --url devnet --keypair $env:DEPLOYER_KEYPAIR
solana balance --url devnet --keypair .devnet/client.json
```

Quando o faucet RPC estiver limitado, use o método proof-of-work indicado pela
documentação oficial da Solana:

```powershell
cargo install devnet-pow
devnet-pow mine -d 3 --reward 0.02 --no-infer -t 5000000000 `
  -k $env:DEPLOYER_KEYPAIR -u dev
```

Transfira SOL de teste para o cliente depois de financiar a autoridade:

```powershell
$client = solana-keygen pubkey .devnet/client.json
solana transfer $client 0.05 --allow-unfunded-recipient --url devnet `
  --keypair $env:DEPLOYER_KEYPAIR
```

## 2. Publicar programa, mint e config

```powershell
anchor build
solana program deploy target/deploy/trato_escrow.so `
  --program-id target/deploy/trato_escrow-keypair.json `
  --keypair $env:DEPLOYER_KEYPAIR --url $env:SOLANA_RPC_URL
npm run setup:devnet
```

`setup:devnet` é idempotente. Ele cria ou reutiliza o mint BRLP-dev, completa as
ATAs de teste até `BRLP_TEST_BALANCE` e inicializa ou atualiza a config com teto e
prazo. O resultado público fica em `.devnet/trato.json`; chaves continuam fora do
Git.

Confirme os dados publicados:

```powershell
solana program show $env:SOLANA_PROGRAM_ID --url devnet `
  --keypair $env:DEPLOYER_KEYPAIR
Get-Content .devnet/trato.json
```

## 3. Subir API e front

Copie `mint` de `.devnet/trato.json` para `SOLANA_TOKEN_MINT` e use:

```text
ESCROW_DRIVER=solana
PAYOUT_DRIVER=mock
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID=<programId de .devnet/trato.json>
SOLANA_TOKEN_MINT=<mint de .devnet/trato.json>
FAUCET_AUTHORITY_SECRET=<caminho absoluto de .devnet/payer.json>
```

Depois aplique migrations/seed e inicie os dois processos:

```powershell
npm run seed --workspace backend
npm run start:backend
npm run start:frontend
```

Vincule a carteira cliente à conta cliente e a carteira da autoridade à conta
freelancer usando o challenge assinado da tela Carteira.

## 4. Matriz de cenários

Crie uma etapa nova para cada linha; não reutilize um escrow fechado.

| Cenário              | Carteira cliente         | Carteira freelancer                   | Resultado esperado                           |
| -------------------- | ------------------------ | ------------------------------------- | -------------------------------------------- |
| Fluxo normal         | `fund`, depois `release` | `submit`                              | etapa `released`; valor no ATA do freelancer |
| Liberação antecipada | `fund`, depois `release` | nenhuma ação                          | etapa `released` partindo de `funded`        |
| Reembolso            | `fund`, depois `refund`  | nenhuma ação                          | etapa `refunded`; valor volta ao cliente     |
| Claim                | `fund`                   | `submit`, aguardar 5 minutos, `claim` | etapa `released` pelo freelancer             |

Em cada ação:

1. registre saldo dos ATAs e saldo do ledger;
2. prepare, assine e confirme pela interface;
3. guarde a assinatura exibida;
4. valide a assinatura no Explorer em cluster devnet;
5. recarregue o projeto e o extrato.

## 5. Excedente enviado ao vault

Depois de `fund` e antes de `release`, obtenha o endereço do vault na resposta da
etapa e envie `1` BRLP extra a partir da ATA do cliente:

```powershell
spl-token transfer $env:SOLANA_TOKEN_MINT 1 <VAULT_ADDRESS> `
  --owner .devnet/client.json --url devnet
```

Execute `release`. O freelancer deve receber apenas o valor contratado, o cliente
deve receber o BRLP excedente e as contas vault/escrow devem ser fechadas. A
mesma propriedade é coberta localmente pelos testes `release_returns_donated_surplus`
e `refund_returns_donated_surplus`.

## 6. Sincronização após ação direta

Para simular uma ação confirmada on-chain sem confirmação HTTP:

1. chame `POST /milestones/:id/:action/prepare` e copie `transactionBase64`;
2. assine e envie a transação com o helper abaixo;
3. não chame `/:action/confirm`;
4. espere confirmação `confirmed` e chame `POST /milestones/:id/sync`.

```powershell
$env:SIGNER_KEYPAIR = (Resolve-Path .devnet/client.json).Path
$env:TRANSACTION_BASE64 = '<transactionBase64>'
$signature = npm run --silent devnet:send-prepared
$signature
```

Para `submit` e `claim`, use o keypair do freelancer. O `sync` deve localizar a
assinatura pelo PDA, validar as contas/efeitos e atualizar status e ledger juntos.
Existe limite de uma sincronização por etapa a cada 30 segundos.

## 7. Saque mock e conciliação

Na conta freelancer:

1. abra **Saldo e extrato** e registre o saldo;
2. solicite um saque Pix;
3. confirme a cotação mock;
4. acompanhe `submitted -> processing -> paid`;
5. confira o histórico e volte ao extrato.

O débito `withdrawal_requested` deve ser igual ao total reservado. Ao concluir, o
ledger move `payout_clearing -> external`; em `failed`, `expired` ou `cancelled`,
uma transação compensatória devolve o valor ao `freelancer_balance`.

## Evidências a guardar

- program ID, config PDA e mint;
- endereços públicos das duas carteiras;
- UUID de cada etapa;
- assinaturas dos cenários e do token excedente;
- saldo de cada ATA antes/depois;
- resposta de `/milestones/:id/sync`;
- IDs do saque mock e das transações correspondentes no ledger.

Nunca registre seed phrase, bytes de keypair, JWT, token PagFinance ou segredo do
faucet nas evidências.
