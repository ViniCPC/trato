import bs58 from 'bs58';
import nacl from 'tweetnacl';

import { verifyWalletProof } from './wallet-proof';

describe('verifyWalletProof', () => {
  const message = 'Vincular carteira à conta Trato\nNonce: teste';
  const owner = nacl.sign.keyPair();
  const attacker = nacl.sign.keyPair();

  it('aceita a assinatura Ed25519 da carteira informada', () => {
    const signature = nacl.sign.detached(
      new TextEncoder().encode(message),
      owner.secretKey,
    );
    expect(
      verifyWalletProof(
        message,
        bs58.encode(owner.publicKey),
        bs58.encode(signature),
      ),
    ).toBe(true);
  });

  it('rejeita assinatura feita por outra carteira', () => {
    const signature = nacl.sign.detached(
      new TextEncoder().encode(message),
      attacker.secretKey,
    );
    expect(
      verifyWalletProof(
        message,
        bs58.encode(owner.publicKey),
        bs58.encode(signature),
      ),
    ).toBe(false);
  });

  it('rejeita Base58 malformado sem lançar erro', () => {
    expect(verifyWalletProof(message, 'inválido', 'também-inválido')).toBe(
      false,
    );
  });
});
