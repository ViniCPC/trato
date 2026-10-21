import { MockPayoutProvider } from './mock-payout.provider';

describe('MockPayoutProvider', () => {
  it('executa o ciclo de cotação, assinatura, processamento e pagamento', async () => {
    const provider = new MockPayoutProvider();
    const input = {
      withdrawalId: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
      amountBaseUnits: 123n,
      asset: 'BRLP' as const,
      fiatCurrency: 'BRL' as const,
      pixKey: 'freelancer@example.com',
      walletAddress: '11111111111111111111111111111111',
    };

    const quote = await provider.quote(input);
    expect(quote.amountBaseUnits).toBe(123n);
    expect(quote.fiatAmountMinor).toBe(123n);

    const prepared = await provider.prepare({
      ...input,
      quoteReference: quote.quoteReference,
    });
    expect(prepared.mockSignature).toMatch(/^mock_/);

    const submitted = await provider.confirm({
      withdrawalId: input.withdrawalId,
      providerReference: prepared.providerReference,
      signature: prepared.mockSignature!,
    });
    expect(submitted.status).toBe('submitted');
    await expect(
      provider.getStatus({ providerReference: prepared.providerReference }),
    ).resolves.toMatchObject({
      status: 'processing',
    });
    await expect(
      provider.getStatus({ providerReference: prepared.providerReference }),
    ).resolves.toMatchObject({
      status: 'paid',
    });
  });
});
