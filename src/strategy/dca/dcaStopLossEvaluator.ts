import { calculateDcaStopLossPrice } from './dcaStopLossCalculator';

export interface DcaStopLossEvaluation {
  initialEntryPrice: string;
  stopLossPercent: string;
  stopLossPrice: string;
  currentPrice: string;
  reached: boolean;
}

export function evaluateDcaStopLoss(
  initialEntryPrice: string,
  stopLossPercent: string,
  currentPrice: string,
): DcaStopLossEvaluation {
  const stopLossPrice = calculateDcaStopLossPrice(
    initialEntryPrice,
    stopLossPercent,
  );

  validatePositiveDecimal(currentPrice, 'current price');

  return {
    initialEntryPrice,
    stopLossPercent,
    stopLossPrice,
    currentPrice,
    reached: compareDecimal(currentPrice, stopLossPrice) <= 0,
  };
}

function validatePositiveDecimal(value: string, label: string): void {
  if (
    !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) ||
    /^0+(?:\.0+)?$/.test(value)
  ) {
    throw new Error(`Invalid DCA ${label}: ${value}`);
  }
}

function compareDecimal(a: string, b: string): number {
  const [aInteger, aFraction] = splitDecimal(a);
  const [bInteger, bFraction] = splitDecimal(b);

  if (aInteger.length !== bInteger.length) {
    return aInteger.length > bInteger.length ? 1 : -1;
  }

  if (aInteger !== bInteger) {
    return aInteger > bInteger ? 1 : -1;
  }

  const scale = Math.max(aFraction.length, bFraction.length);
  const aScaled = aFraction.padEnd(scale, '0');
  const bScaled = bFraction.padEnd(scale, '0');

  if (aScaled === bScaled) {
    return 0;
  }

  return aScaled > bScaled ? 1 : -1;
}

function splitDecimal(value: string): [string, string] {
  const [integerPart, fractionPart = ''] = value.split('.');
  return [integerPart, fractionPart];
}
