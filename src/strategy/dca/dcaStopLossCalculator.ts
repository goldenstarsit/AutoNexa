export function calculateDcaStopLossPrice(
  initialEntryPrice: string,
  stopLossPercent: string,
): string {
  validatePositiveDecimal(initialEntryPrice, 'initial entry price');
  validateNonNegativeDecimal(stopLossPercent, 'stop-loss percent');

  const price = toScaledInteger(initialEntryPrice);
  const percent = toScaledInteger(stopLossPercent);
  const scale = Math.max(price.scale, percent.scale);

  const priceInteger = scaleInteger(
    price.integer,
    price.scale,
    scale,
  );
  const percentInteger = scaleInteger(
    percent.integer,
    percent.scale,
    scale,
  );

  const hundred = BigInt(100) * BigInt(10) ** BigInt(scale);
  const numerator = priceInteger * (hundred - percentInteger);

  if (percentInteger > hundred) {
    throw new Error(
      `DCA stop-loss percent must be at most 100: ${stopLossPercent}`,
    );
  }

  const resultScale = scale * 2 + 2;
  const result =
    (numerator * BigInt(10) ** BigInt(scale + 2)) / hundred;

  return formatScaledInteger(result, resultScale);
}

function validatePositiveDecimal(
  value: string,
  label: string,
): void {
  validateDecimal(value, label);

  if (isZero(value)) {
    throw new Error(`DCA ${label} must be positive`);
  }
}

function validateNonNegativeDecimal(
  value: string,
  label: string,
): void {
  validateDecimal(value, label);
}

function validateDecimal(
  value: string,
  label: string,
): void {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error(`Invalid DCA ${label}: ${value}`);
  }
}

function isZero(value: string): boolean {
  return /^0+(?:\.0+)?$/.test(value);
}

function toScaledInteger(
  value: string,
): { integer: bigint; scale: number } {
  const [integerPart, fractionPart = ''] = value.split('.');
  const scale = fractionPart.length;

  return {
    integer: BigInt(`${integerPart}${fractionPart}`),
    scale,
  };
}

function scaleInteger(
  integer: bigint,
  currentScale: number,
  targetScale: number,
): bigint {
  return (
    integer *
    BigInt(10) ** BigInt(targetScale - currentScale)
  );
}

function formatScaledInteger(
  integer: bigint,
  scale: number,
): string {
  const text = integer
    .toString()
    .padStart(scale + 1, '0');

  if (scale === 0) {
    return text;
  }

  const integerPart = text.slice(0, -scale) || '0';
  const fractionPart = text
    .slice(-scale)
    .replace(/0+$/, '');

  return fractionPart
    ? `${integerPart}.${fractionPart}`
    : integerPart;
}
