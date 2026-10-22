import { BrlpPipe } from './brlp.pipe';

describe('BrlpPipe', () => {
  const pipe = new BrlpPipe();

  it('formats six-decimal base units with the configured token symbol', () => {
    expect(pipe.transform('1500000000')).toContain('1.500,00 BRLP');
  });

  it('keeps values above Number.MAX_SAFE_INTEGER exact', () => {
    expect(pipe.transform('9007199254740993990000')).toContain('9.007.199.254.740.993,99');
  });
});
