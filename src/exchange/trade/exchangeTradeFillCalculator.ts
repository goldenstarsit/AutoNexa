import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';

export interface TradeFillTotals {
  quantity: string;
  quoteQuantity: string;
  averagePrice: string;
}

export function calculateTradeFillTotals(
  trades: ExchangeTrade[],
): TradeFillTotals {
  if (trades.length === 0) {
    throw new Error('Cannot calculate fill totals without trade fills');
  }

  let totalQuantity = '0';
  let totalQuoteQuantity = '0';

  for (const trade of trades) {
    if (trade.side !== 'buy' && trade.side !== 'sell') {
      throw new Error(
        `Invalid trade side: ${trade.tradeId}`,
      );
    }

    if (
      !isPositiveDecimal(trade.quantity) ||
      !isPositiveDecimal(trade.quoteQuantity)
    ) {
      throw new Error(
        `Invalid trade fill quantities: ${trade.tradeId}`,
      );
    }

    totalQuantity = addDecimal(totalQuantity, trade.quantity);
    totalQuoteQuantity = addDecimal(
      totalQuoteQuantity,
      trade.quoteQuantity,
    );
  }

  if (isZeroDecimal(totalQuantity)) {
    throw new Error('Trade fills have zero total quantity');
  }

  return {
    quantity: totalQuantity,
    quoteQuantity: totalQuoteQuantity,
    averagePrice: divideDecimal(
      totalQuoteQuantity,
      totalQuantity,
    ),
  };
}

export function combineTradeFillTotals(
  initial: Pick<TradeFillTotals, 'quantity' | 'quoteQuantity'>,
  additional: Pick<TradeFillTotals, 'quantity' | 'quoteQuantity'>,
): TradeFillTotals {
  const quantity = addDecimal(
    initial.quantity,
    additional.quantity,
  );
  const quoteQuantity = addDecimal(
    initial.quoteQuantity,
    additional.quoteQuantity,
  );

  if (isZeroDecimal(quantity)) {
    throw new Error('Combined trade fills have zero total quantity');
  }

  return {
    quantity,
    quoteQuantity,
    averagePrice: divideDecimal(
      quoteQuantity,
      quantity,
    ),
  };
}

export function calculateWeightedAverageTradePrice(
  trades: ExchangeTrade[],
): string {
  return calculateTradeFillTotals(trades).averagePrice;
}

function isPositiveDecimal(value: string): boolean {
  return (
    /^[0-9]+(?:\.[0-9]+)?$/.test(value.trim()) &&
    !isZeroDecimal(value)
  );
}

function isZeroDecimal(value: string): boolean {
  return /^0+(?:\.0+)?$/.test(value.trim());
}

function addDecimal(a: string, b: string): string {
  const [aInteger, aFraction = ''] = normalizeDecimal(a);
  const [bInteger, bFraction = ''] = normalizeDecimal(b);
  const scale = Math.max(aFraction.length, bFraction.length);

  const aScaled = BigInt(
    `${aInteger}${aFraction.padEnd(scale, '0')}`,
  );
  const bScaled = BigInt(
    `${bInteger}${bFraction.padEnd(scale, '0')}`,
  );

  const sum = aScaled + bScaled;
  const text = sum.toString().padStart(scale + 1, '0');

  if (scale === 0) {
    return text;
  }

  const integerPart = text.slice(0, -scale) || '0';
  const fractionPart = text.slice(-scale).replace(/0+$/, '');

  return fractionPart
    ? `${integerPart}.${fractionPart}`
    : integerPart;
}

function divideDecimal(dividend: string, divisor: string): string {
  const [dividendInteger, dividendFraction = ''] =
    normalizeDecimal(dividend);
  const [divisorInteger, divisorFraction = ''] =
    normalizeDecimal(divisor);

  const dividendScale = dividendFraction.length;
  const divisorScale = divisorFraction.length;

  const dividendDigits = BigInt(
    `${dividendInteger}${dividendFraction}`,
  );
  const divisorDigits = BigInt(
    `${divisorInteger}${divisorFraction}`,
  );

  if (divisorDigits === BigInt(0)) {
    throw new Error('Cannot divide by zero');
  }

  const scale = 18;
  const numerator =
    dividendDigits *
    BigInt(10) ** BigInt(scale + divisorScale);
  const denominator =
    divisorDigits *
    BigInt(10) ** BigInt(dividendScale);
  const quotient = numerator / denominator;

  const text = quotient.toString().padStart(scale + 1, '0');
  const integerPart = text.slice(0, -scale) || '0';
  const fractionPart = text.slice(-scale).replace(/0+$/, '');

  return fractionPart
    ? `${integerPart}.${fractionPart}`
    : integerPart;
}

function normalizeDecimal(value: string): [string, string] {
  const normalized = value.trim();

  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const [integerPart, fractionPart = ''] =
    normalized.split('.');

  return [
    integerPart.replace(/^0+(?=\d)/, '') || '0',
    fractionPart,
  ];
}
