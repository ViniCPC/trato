import { baseUnitsToBrl, brlInputToBaseUnits, maskBrlInput } from './money';

describe('money utils', () => {
  describe('brlInputToBaseUnits', () => {
    it('converts a formatted BRL value to six-decimal base units', () => {
      expect(brlInputToBaseUnits('1.500,00')).toBe('1500000000');
    });

    it('accepts currency prefix and a single decimal digit', () => {
      expect(brlInputToBaseUnits('R$ 12,5')).toBe('12500000');
    });

    it('keeps large values exact', () => {
      expect(brlInputToBaseUnits('9.007.199.254.740.993,99')).toBe('9007199254740993990000');
    });

    it('rejects malformed values', () => {
      expect(() => brlInputToBaseUnits('1.50,00')).toThrowError(RangeError);
    });
  });

  describe('baseUnitsToBrl', () => {
    it('formats base units as BRL', () => {
      expect(baseUnitsToBrl('1500000000')).toContain('1.500,00');
    });

    it('formats values beyond Number.MAX_SAFE_INTEGER without precision loss', () => {
      expect(baseUnitsToBrl('9007199254740993990000')).toContain('9.007.199.254.740.993,99');
    });

    it('rounds the third cent digit using integer arithmetic', () => {
      expect(baseUnitsToBrl('1005000')).toContain('1,01');
    });

    it('rejects non-integer strings', () => {
      expect(() => baseUnitsToBrl('1.50')).toThrowError(RangeError);
    });
  });

  describe('maskBrlInput', () => {
    it('moves typed digits through the cent positions', () => {
      expect(maskBrlInput('1')).toBe('0,01');
      expect(maskBrlInput('12')).toBe('0,12');
      expect(maskBrlInput('123')).toBe('1,23');
    });

    it('groups large integer values without Number', () => {
      expect(maskBrlInput('900719925474099399')).toBe('9.007.199.254.740.993,99');
    });

    it('returns an empty value when there are no digits', () => {
      expect(maskBrlInput('R$')).toBe('');
    });
  });
});
