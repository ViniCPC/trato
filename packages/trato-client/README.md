# `@trato/trato-client`

Ponto único de verdade para o programa on-chain do Trato.

- `idl/trato_escrow.json`: IDL gerado e versionado.
- `types/trato_escrow.ts`: tipo gerado pelo Anchor.
- `uuidToBytes()`: representação canônica do UUID usada nas seeds.
- `findEscrowPda()`: derivação assíncrona e canônica da PDA `["escrow", client, milestoneId]`.
- `getInstructionDiscriminator()`: discriminator lido do IDL para validar confirmações.

Execute `npm test` para validar os helpers sempre que o IDL for atualizado.
