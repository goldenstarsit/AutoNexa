export interface DcaTakeProfitEvaluation {
  takeProfitPrice: string;
  currentPrice: string;
  reached: boolean;
}

export function evaluateDcaTakeProfit(
  averageEntryPrice: string,
  takeProfitPercent: string,
  currentPrice: string,
  takeProfitPrice: string,
): DcaTakeProfitEvaluation {
  validatePositiveDecimal(averageEntryPrice, 'average entry price');
  validateNonNegativeDecimal(takeProfitPercent, 'take-profit percent');
  validatePositiveDecimal(currentPrice, 'current price');
  validatePositiveDecimal(takeProfitPrice, 'take-profit price');

  return {
    takeProfitPrice,
    currentPrice,
    reached: compareDecimal(currentPrice, takeProfitPrice) >= 0,
  };
}

function validatePositiveDecimal(value: string, label: string): void {
  validateDecimal(value, label);

  if (/^0+(?:\.0+)?$/.test(value)) {
    throw new Error(`DCA ${label} must be positive`);
  }
}

function validateNonNegativeDecimal(value: string, label: string): void {
  validateDecimal(value, label);
}

function validateDecimal(value: string, label: string): void {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error(`Invalid DCA ${label}: ${value}`);
  }
}

function compareDecimal(left: string, right: string): number {
  const [leftInteger, leftFraction = ''] = left.split('.');
  const [rightInteger, rightFraction = ''] = right.split('.');

  const integerComparison =
    BigInt(leftInteger) < BigInt(rightInteger)
      ? -1
      : BigInt(leftInteger) > BigInt(rightInteger)
        ? 1
        : 0;

  if (integerComparison !== 0) {
    return integerComparison;
  }

  const scale = Math.max(leftFraction.length, rightFraction.length);
  const leftScaled = BigInt(
    `${leftInteger}${leftFraction.padEnd(scale, '0')}`,
  );
  const rightScaled = BigInt(
    `${rightInteger}${rightFraction.padEnd(scale, '0')}`,
  );

  return leftScaled < rightScaled ? -1 : leftScaled > rightScaled ? 1 : 0;
}
