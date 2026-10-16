import bs58 from 'bs58';
import nacl from 'tweetnacl';

export function verifyWalletProof(
  message: string,
  walletAddress: string,
  signatureBase58: string,
): boolean {
  try {
    const signature = bs58.decode(signatureBase58);
    const publicKey = bs58.decode(walletAddress);
    return (
      signature.length === nacl.sign.signatureLength &&
      publicKey.length === nacl.sign.publicKeyLength &&
      nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        signature,
        publicKey,
      )
    );
  } catch {
    return false;
  }
}
