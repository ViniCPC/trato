import { environment } from '../../../environments/environment';

const BASE_UNITS_PER_REAL = 10n ** BigInt(environment.tokenDecimals);
const BASE_UNITS_PER_CENT = BASE_UNITS_PER_REAL / 100n;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

export function maskBrlInput(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) {
    return '';
  }

  const cents = BigInt(digits);
  const reais = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${integerFormatter.format(reais)},${fraction}`;
}

export function brlInputToBaseUnits(input: string): string {
  const normalized = input
    .trim()
    .replace(/^R\$\s?/, '')
    .replace(/\s/g, '');
  const match = /^(-)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    throw new RangeError('Informe um valor em reais válido.');
  }

  const integerDigits = match[2].replace(/\./g, '');
  const decimalDigits = (match[3] ?? '').padEnd(2, '0');
  const absoluteValue =
    BigInt(integerDigits) * BASE_UNITS_PER_REAL +
    BigInt(decimalDigits || '0') * BASE_UNITS_PER_CENT;

  return (match[1] ? -absoluteValue : absoluteValue).toString();
}

export function baseUnitsToBrl(baseUnits: string): string {
  if (!/^-?\d+$/.test(baseUnits)) {
    throw new RangeError('Base units deve ser uma string de inteiro.');
  }

  const rawValue = BigInt(baseUnits);
  const absoluteValue = rawValue < 0n ? -rawValue : rawValue;
  const roundedCents = (absoluteValue + BASE_UNITS_PER_CENT / 2n) / BASE_UNITS_PER_CENT;
  const integerReais = roundedCents / 100n;
  const cents = (roundedCents % 100n).toString().padStart(2, '0');
  const formatted = currencyFormatter
    .formatToParts(integerReais)
    .map((part) => (part.type === 'fraction' ? cents : part.value))
    .join('');

  return rawValue < 0n && roundedCents > 0n ? `-${formatted}` : formatted;
}

export function baseUnitsToToken(baseUnits: string): string {
  if (!/^-?\d+$/.test(baseUnits)) {
    throw new RangeError('Base units deve ser uma string de inteiro.');
  }

  const rawValue = BigInt(baseUnits);
  const absoluteValue = rawValue < 0n ? -rawValue : rawValue;
  const scale = 10n ** BigInt(environment.tokenDecimals);
  const whole = absoluteValue / scale;
  const fraction = (absoluteValue % scale)
    .toString()
    .padStart(environment.tokenDecimals, '0')
    .replace(/0+$/, '')
    .padEnd(2, '0');
  const sign = rawValue < 0n ? '-' : '';
  const decimal = fraction ? `,${fraction}` : '';
  return `${sign}${integerFormatter.format(whole)}${decimal} ${environment.tokenSymbol}`;
}

export function minorUnitsToBrl(minorUnits: string): string {
  if (!/^-?\d+$/.test(minorUnits)) {
    throw new RangeError('Minor units deve ser uma string de inteiro.');
  }

  const rawValue = BigInt(minorUnits);
  const absoluteValue = rawValue < 0n ? -rawValue : rawValue;
  const integerReais = absoluteValue / 100n;
  const cents = (absoluteValue % 100n).toString().padStart(2, '0');
  const formatted = currencyFormatter
    .formatToParts(integerReais)
    .map((part) => (part.type === 'fraction' ? cents : part.value))
    .join('');
  return rawValue < 0n ? `-${formatted}` : formatted;
}
