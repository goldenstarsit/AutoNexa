export function addDecimalAmounts(
  left: string,
  right: string,
): string {
  const a = normalizeDecimal(left);
  const b = normalizeDecimal(right);
  const scale = Math.max(a.scale, b.scale);
  const leftDigits = padFraction(a, scale);
  const rightDigits = padFraction(b, scale);

  return formatDecimal(
    addIntegerStrings(leftDigits, rightDigits),
    scale,
  );
}

export function subtractDecimalAmounts(
  left: string,
  right: string,
): string {
  const a = normalizeDecimal(left);
  const b = normalizeDecimal(right);
  const scale = Math.max(a.scale, b.scale);
  const leftDigits = padFraction(a, scale);
  const rightDigits = padFraction(b, scale);

  if (compareIntegerStrings(leftDigits, rightDigits) < 0) {
    throw new Error(`Decimal amount cannot become negative: ${left} - ${right}`);
  }

  return formatDecimal(
    subtractIntegerStrings(leftDigits, rightDigits),
    scale,
  );
}

export function compareDecimalAmounts(
  left: string,
  right: string,
): -1 | 0 | 1 {
  const a = normalizeDecimal(left);
  const b = normalizeDecimal(right);
  const scale = Math.max(a.scale, b.scale);

  return compareIntegerStrings(
    padFraction(a, scale),
    padFraction(b, scale),
  );
}

export function validatePositiveDecimalAmount(amount: string): void {
  const normalized = normalizeDecimal(amount);

  if (normalized.digits === '0') {
    throw new Error(`Invalid balance amount: ${amount}`);
  }
}

interface DecimalParts {
  digits: string;
  scale: number;
}

function normalizeDecimal(amount: string): DecimalParts {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount)) {
    throw new Error(`Invalid decimal amount: ${amount}`);
  }

  const [whole, fraction = ''] = amount.split('.');
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '');

  return {
    digits,
    scale: fraction.length,
  };
}

function padFraction(
  value: DecimalParts,
  scale: number,
): string {
  return value.digits + '0'.repeat(scale - value.scale);
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

  return result.replace(/^0+(?=\d)/, '');
}

function subtractIntegerStrings(
  left: string,
  right: string,
): string {
  let i = left.length - 1;
  let j = right.length - 1;
  let borrow = 0;
  let result = '';

  while (i >= 0) {
    let difference =
      left.charCodeAt(i) - 48 - borrow -
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

  return result.replace(/^0+(?=\d)/, '');
}

function compareIntegerStrings(
  left: string,
  right: string,
): -1 | 0 | 1 {
  const normalizedLeft = left.replace(/^0+(?=\d)/, '');
  const normalizedRight = right.replace(/^0+(?=\d)/, '');

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

function formatDecimal(
  digits: string,
  scale: number,
): string {
  const normalized = digits.replace(/^0+(?=\d)/, '');

  if (normalized === '0') {
    return '0';
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

  return fraction === ''
    ? whole
    : `${whole}.${fraction}`;
}
