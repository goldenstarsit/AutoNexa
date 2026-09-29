import type { DcaConfigurationOrderRecord } from './dcaConfigurationRepository';

export interface DcaTriggerLevel {
  level: number;
  dcaOrderId: string;
  dropPercent: string;
  triggerPrice: string;
}

export interface DcaLevelEvaluation {
  level: number;
  dcaOrderId: string;
  dropPercent: string;
  triggerPrice: string;
  reached: boolean;
}

export function calculateDcaTriggerPrice(
  initialEntryPrice: string,
  dropPercent: string,
): string {
  const initial = parsePositiveDecimal(
    initialEntryPrice,
    'initial entry price',
  );
  const drop = parseNonNegativeDecimal(
    dropPercent,
    'DCA drop percentage',
  );

  if (compareDecimal(drop, '100') >= 0) {
    throw new Error(
      `DCA drop percentage must be less than 100: ${dropPercent}`,
    );
  }

  const remainingPercent = subtractDecimal('100', drop);
  return divideDecimal(
    multiplyDecimal(initial, remainingPercent),
    '100',
  );
}

export function calculateDcaTriggerLevels(
  initialEntryPrice: string,
  orders: DcaConfigurationOrderRecord[],
): DcaTriggerLevel[] {
  if (orders.length === 0) {
    throw new Error('DCA configuration has no DCA levels');
  }

  const sortedOrders = [...orders].sort(
    (a, b) => a.level - b.level,
  );

  return sortedOrders.map((order) => {
    if (!Number.isInteger(order.level) || order.level < 1) {
      throw new Error(`Invalid DCA level: ${order.level}`);
    }

    return {
      level: order.level,
      dcaOrderId: order.dcaOrderId,
      dropPercent: order.dropPercent,
      triggerPrice: calculateDcaTriggerPrice(
        initialEntryPrice,
        order.dropPercent,
      ),
    };
  });
}

export function evaluateDcaLevels(
  currentPrice: string,
  levels: DcaTriggerLevel[],
): DcaLevelEvaluation[] {
  const price = parsePositiveDecimal(currentPrice, 'current price');

  return levels.map((level) => ({
    ...level,
    reached: compareDecimal(price, level.triggerPrice) <= 0,
  }));
}

function parsePositiveDecimal(
  value: string,
  field: string,
): string {
  if (
    !/^[0-9]+(?:\.[0-9]+)?$/.test(value.trim()) ||
    isZeroDecimal(value)
  ) {
    throw new Error(`Invalid ${field}: ${value}`);
  }

  return normalizeDecimal(value);
}

function parseNonNegativeDecimal(
  value: string,
  field: string,
): string {
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(value.trim())) {
    throw new Error(`Invalid ${field}: ${value}`);
  }

  return normalizeDecimal(value);
}

function normalizeDecimal(value: string): string {
  const [integerPart, fractionPart = ''] = value.trim().split('.');
  const integer = integerPart.replace(/^0+(?=\d)/, '') || '0';
  const fraction = fractionPart.replace(/0+$/, '');

  return fraction ? `${integer}.${fraction}` : integer;
}

function isZeroDecimal(value: string): boolean {
  return /^0+(?:\.0+)?$/.test(value.trim());
}

function splitDecimal(value: string): [string, string] {
  const normalized = normalizeDecimal(value);
  const [integerPart, fractionPart = ''] = normalized.split('.');
  return [integerPart, fractionPart];
}

function compareDecimal(a: string, b: string): number {
  const [aInteger, aFraction] = splitDecimal(a);
  const [bInteger, bFraction] = splitDecimal(b);

  const integerCompare =
    aInteger.length !== bInteger.length
      ? aInteger.length > bInteger.length
        ? 1
        : -1
      : aInteger === bInteger
        ? 0
        : aInteger > bInteger
          ? 1
          : -1;

  if (integerCompare !== 0) {
    return integerCompare;
  }

  const scale = Math.max(aFraction.length, bFraction.length);
  const aScaled = `${aFraction.padEnd(scale, '0')}`;
  const bScaled = `${bFraction.padEnd(scale, '0')}`;

  if (aScaled === bScaled) {
    return 0;
  }

  return aScaled > bScaled ? 1 : -1;
}

function subtractDecimal(a: string, b: string): string {
  if (compareDecimal(a, b) < 0) {
    throw new Error(`Cannot subtract ${b} from ${a}`);
  }

  const [aInteger, aFraction] = splitDecimal(a);
  const [bInteger, bFraction] = splitDecimal(b);
  const scale = Math.max(aFraction.length, bFraction.length);

  const aScaled = BigInt(
    `${aInteger}${aFraction.padEnd(scale, '0')}`,
  );
  const bScaled = BigInt(
    `${bInteger}${bFraction.padEnd(scale, '0')}`,
  );

  return fromScaledInteger(aScaled - bScaled, scale);
}

function multiplyDecimal(a: string, b: string): string {
  const [aInteger, aFraction] = splitDecimal(a);
  const [bInteger, bFraction] = splitDecimal(b);

  const aDigits = BigInt(`${aInteger}${aFraction}`);
  const bDigits = BigInt(`${bInteger}${bFraction}`);
  const scale = aFraction.length + bFraction.length;

  return fromScaledInteger(aDigits * bDigits, scale);
}

function divideDecimal(dividend: string, divisor: string): string {
  if (isZeroDecimal(divisor)) {
    throw new Error('Cannot divide by zero');
  }

  const [dividendInteger, dividendFraction] = splitDecimal(dividend);
  const [divisorInteger, divisorFraction] = splitDecimal(divisor);

  const dividendDigits = BigInt(
    `${dividendInteger}${dividendFraction}`,
  );
  const divisorDigits = BigInt(
    `${divisorInteger}${divisorFraction}`,
  );

  const scale = 18;
  const numerator =
    dividendDigits *
    BigInt(10) ** BigInt(scale + divisorFraction.length);
  const denominator =
    divisorDigits *
    BigInt(10) ** BigInt(dividendFraction.length);

  const quotient = numerator / denominator;

  return fromScaledInteger(quotient, scale);
}

function fromScaledInteger(
  value: bigint,
  scale: number,
): string {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const text = absolute
    .toString()
    .padStart(scale + 1, '0');

  if (scale === 0) {
    return `${negative ? '-' : ''}${text}`;
  }

  const integerPart = text.slice(0, -scale) || '0';
  const fractionPart = text
    .slice(-scale)
    .replace(/0+$/, '');

  return `${negative ? '-' : ''}${integerPart}${
    fractionPart ? `.${fractionPart}` : ''
  }`;
}
