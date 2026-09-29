import type { ExchangeTradingRules } from '../../exchange/market/exchangeTradingRules';
import { ExchangeService } from '../../exchange/exchangeService';

export interface DcaTradingRuleResolution {
  rules: ExchangeTradingRules;
  minimumNotional: string;
  minimumQuantity: string;
}

export class DcaTradingRuleResolver {
  private readonly exchangeService: ExchangeService;

  constructor(db: ConstructorParameters<typeof ExchangeService>[0]) {
    this.exchangeService = new ExchangeService(db);
  }

  async resolve(
    exchangeId: string,
    symbol: string,
  ): Promise<DcaTradingRuleResolution> {
    const rules = await this.exchangeService.getTradingRules(
      exchangeId,
      symbol,
    );

    if (!rules) {
      throw new Error(
        `Trading rules not found: ${exchangeId}:${symbol}`,
      );
    }

    if (!rules.spotTradingAllowed) {
      throw new Error(
        `Spot trading is disabled: ${exchangeId}:${symbol}`,
      );
    }

    const minimumNotional = rules.quoteAmountPrecisionMarket;

    if (!minimumNotional || minimumNotional === '0') {
      throw new Error(
        `Market minimum notional is unavailable: ${exchangeId}:${symbol}`,
      );
    }

    const price = await this.exchangeService.getCurrentPrice(
      exchangeId,
      symbol,
    );

    if (!price || price === '0') {
      throw new Error(
        `Current price is unavailable: ${exchangeId}:${symbol}`,
      );
    }

    if (!rules.baseSizePrecision || rules.baseSizePrecision === '0') {
      throw new Error(
        `Base size precision is unavailable: ${exchangeId}:${symbol}`,
      );
    }

    const minimumQuantity = calculateMinimumQuantity(
      minimumNotional,
      price,
      rules.baseSizePrecision,
    );

    return {
      rules,
      minimumNotional,
      minimumQuantity,
    };
  }
}

function calculateMinimumQuantity(
  minimumNotional: string,
  price: string,
  baseSizePrecision: string,
): string {
  const notional = toScaledInteger(minimumNotional);
  const priceValue = toScaledInteger(price);
  const size = toScaledInteger(baseSizePrecision);

  const numerator = multiplyByPowerOfTen(
    notional.digits,
    priceValue.scale,
  );
  const denominator = multiplyByPowerOfTen(
    priceValue.digits,
    notional.scale,
  );

  const requiredSteps = divideCeil(
    numerator,
    multiplyIntegerStrings(denominator, size.digits),
  );

  const quantityDigits = multiplyIntegerStrings(
    requiredSteps,
    size.digits,
  );

  return formatScaledInteger(quantityDigits, size.scale);
}

interface ScaledInteger {
  digits: string;
  scale: number;
}

function toScaledInteger(value: string): ScaledInteger {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const [whole, fraction = ''] = value.split('.');
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '');

  if (digits === '0') {
    throw new Error(`Decimal value must be positive: ${value}`);
  }

  return {
    digits,
    scale: fraction.length,
  };
}

function multiplyByPowerOfTen(
  digits: string,
  power: number,
): string {
  if (digits === '0') {
    return '0';
  }

  return digits + '0'.repeat(power);
}

function multiplyIntegerStrings(
  left: string,
  right: string,
): string {
  if (left === '0' || right === '0') {
    return '0';
  }

  let result = '0';

  for (let i = right.length - 1; i >= 0; i -= 1) {
    const digit = right.charCodeAt(i) - 48;
    let row = '0';

    for (let j = 0; j < digit; j += 1) {
      row = addIntegerStrings(row, left);
    }

    row += '0'.repeat(right.length - 1 - i);
    result = addIntegerStrings(result, row);
  }

  return result;
}

function divideCeil(
  numerator: string,
  denominator: string,
): string {
  if (denominator === '0') {
    throw new Error('Cannot divide by zero');
  }

  const quotient = divideIntegerStrings(numerator, denominator);
  const product = multiplyIntegerStrings(quotient, denominator);

  return product === numerator
    ? quotient
    : addIntegerStrings(quotient, '1');
}

function divideIntegerStrings(
  numerator: string,
  denominator: string,
): string {
  let remainder = '0';
  let quotient = '';

  for (const digit of numerator) {
    remainder = stripLeadingZeros(
      remainder === '0'
        ? digit
        : `${remainder}${digit}`,
    );

    let count = 0;

    while (compareIntegerStrings(remainder, denominator) >= 0) {
      remainder = subtractIntegerStrings(
        remainder,
        denominator,
      );
      count += 1;
    }

    quotient += String(count);
  }

  return stripLeadingZeros(quotient);
}

function addIntegerStrings(
  left: string,
  right: string,
): string {
  let i = left.length - 1;
  let j = right.length - 1;
  let carry = 0;
  let result = '';

  while (i >= 0 || j >= 0 || carry > 0) {
    const a = i >= 0 ? left.charCodeAt(i) - 48 : 0;
    const b = j >= 0 ? right.charCodeAt(j) - 48 : 0;
    const sum = a + b + carry;

    result = String(sum % 10) + result;
    carry = Math.floor(sum / 10);
    i -= 1;
    j -= 1;
  }

  return stripLeadingZeros(result);
}

function subtractIntegerStrings(
  left: string,
  right: string,
): string {
  let i = left.length - 1;
  let j = right.length - 1;
  let borrow = 0;
  let result = '';

  if (compareIntegerStrings(left, right) < 0) {
    throw new Error(`Integer subtraction cannot become negative`);
  }

  while (i >= 0) {
    let difference =
      left.charCodeAt(i) -
      48 -
      borrow -
      (j >= 0 ? right.charCodeAt(j) - 48 : 0);

    if (difference < 0) {
      difference += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }

    result = String(difference) + result;
    i -= 1;
    j -= 1;
  }

  return stripLeadingZeros(result);
}

function compareIntegerStrings(
  left: string,
  right: string,
): -1 | 0 | 1 {
  const normalizedLeft = stripLeadingZeros(left);
  const normalizedRight = stripLeadingZeros(right);

  if (normalizedLeft.length < normalizedRight.length) {
    return -1;
  }

  if (normalizedLeft.length > normalizedRight.length) {
    return 1;
  }

  if (normalizedLeft < normalizedRight) {
    return -1;
  }

  if (normalizedLeft > normalizedRight) {
    return 1;
  }

  return 0;
}

function stripLeadingZeros(value: string): string {
  return value.replace(/^0+(?=\d)/, '');
}

function formatScaledInteger(
  digits: string,
  scale: number,
): string {
  const normalized = stripLeadingZeros(digits);

  if (normalized === '0') {
    throw new Error(`Calculated quantity must be positive`);
  }

  if (scale === 0) {
    return normalized;
  }

  const padded = normalized.padStart(scale + 1, '0');
  const splitAt = padded.length - scale;
  const whole = padded.slice(0, splitAt);
  const fraction = padded
    .slice(splitAt)
    .replace(/0+$/, '');

  return fraction === '' ? whole : `${whole}.${fraction}`;
}
