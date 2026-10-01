import type { ExchangeOrderRequest } from '../../../domain/exchange/exchangeOrder';
import type { ExchangeSymbolInfo } from '../../market/exchangeMarket';

export function validateMexcOrder(
  request: ExchangeOrderRequest,
  symbolInfo: ExchangeSymbolInfo,
): void {
  validatePositiveNumber(request.quantity, 'quantity');

  if (
    request.type !== 'market' &&
    request.type !== 'limit' &&
    request.type !== 'makerOnly'
  ) {
    throw new Error(`Unsupported MEXC order type: ${request.type}`);
  }

  const mexcOrderType =
    request.type === 'makerOnly' ? 'LIMIT_MAKER' : request.type.toUpperCase();

  if (!symbolInfo.orderTypes.includes(mexcOrderType)) {
    throw new Error(
      `MEXC symbol does not support order type: ${mexcOrderType}`,
    );
  }

  if (request.type !== 'market') {
    if (request.price === undefined) {
      throw new Error(`${request.type} order requires a price`);
    }

    validatePositiveNumber(request.price, 'price');

    validateDecimalPlaces(
      request.price,
      symbolInfo.quotePrecision,
      'price',
    );
  }

  validatePositiveNumber(
    symbolInfo.baseSizePrecision,
    'baseSizePrecision',
  );
  validatePositiveNumber(
    symbolInfo.quoteAmountPrecision,
    'quoteAmountPrecision',
  );

  if (symbolInfo.maxQuoteAmount) {
    validatePositiveNumber(symbolInfo.maxQuoteAmount, 'maxQuoteAmount');
  }

  validateDecimalPlaces(
    request.quantity,
    decimalPlaces(symbolInfo.baseSizePrecision),
    'quantity',
  );

  if (compareDecimal(request.quantity, symbolInfo.baseSizePrecision) < 0) {
    throw new Error(
      `MEXC quantity must be at least ${symbolInfo.baseSizePrecision}`,
    );
  }

  if (!isDecimalMultiple(request.quantity, symbolInfo.baseSizePrecision)) {
    throw new Error(
      `MEXC quantity must be a multiple of ${symbolInfo.baseSizePrecision}`,
    );
  }

  if (request.type !== 'market') {
    const notional = multiplyDecimal(
      request.quantity,
      request.price!,
    );

    if (
      compareDecimal(
        notional,
        symbolInfo.quoteAmountPrecision,
      ) < 0
    ) {
      throw new Error(
        `MEXC order value must be at least ${symbolInfo.quoteAmountPrecision}`,
      );
    }

    if (
      symbolInfo.maxQuoteAmount &&
      compareDecimal(
        notional,
        symbolInfo.maxQuoteAmount,
      ) > 0
    ) {
      throw new Error(
        `MEXC order value must not exceed ${symbolInfo.maxQuoteAmount}`,
      );
    }
}

function multiplyDecimal(left: string, right: string): string {
  const [leftInteger, leftFraction = ''] = left.split('.');
  const [rightInteger, rightFraction = ''] = right.split('.');
  const leftDigits = `${leftInteger}${leftFraction}`;
  const rightDigits = `${rightInteger}${rightFraction}`;
  const scale = leftFraction.length + rightFraction.length;
  const product = BigInt(leftDigits) * BigInt(rightDigits);
  const value = product.toString();

  if (scale === 0) {
    return value;
  }

  const padded = value.padStart(scale + 1, '0');
  const position = padded.length - scale;

  return `${padded.slice(0, position)}.${padded.slice(position)}`;
}

function isDecimalMultiple(value: string, step: string): boolean {
  const [, valueFraction = ''] = value.split('.');
  const [, stepFraction = ''] = step.split('.');
  const scale = Math.max(valueFraction.length, stepFraction.length);

  const valueInteger = BigInt(
    `${value.split('.')[0]}${valueFraction.padEnd(scale, '0')}`,
  );
  const stepInteger = BigInt(
    `${step.split('.')[0]}${stepFraction.padEnd(scale, '0')}`,
  );

  return valueInteger % stepInteger === BigInt(0);
}

function compareDecimal(left: string, right: string): number {
  const [leftInteger, leftFraction = ''] = left.split('.');
  const [rightInteger, rightFraction = ''] = right.split('.');
  const leftNormalizedInteger = leftInteger.replace(/^0+(?=\d)/, '');
  const rightNormalizedInteger = rightInteger.replace(/^0+(?=\d)/, '');
  const scale = Math.max(leftFraction.length, rightFraction.length);

  const leftNormalized = BigInt(
    `${leftNormalizedInteger}${leftFraction.padEnd(scale, '0')}`,
  );

  const rightNormalized = BigInt(
    `${rightNormalizedInteger}${rightFraction.padEnd(scale, '0')}`,
  );

  if (leftNormalized < rightNormalized) {
    return -1;
  }

  if (leftNormalized > rightNormalized) {
    return 1;
  }

  return 0;
}

function validatePositiveNumber(
  value: string,
  field: string,
): void {
  if (
    !/^(?:\d+\.?\d*|\.\d+)$/.test(value) ||
    compareDecimal(value, '0') <= 0
  ) {
    throw new Error(`MEXC ${field} must be a positive number`);
  }
}

function validateDecimalPlaces(
  value: string,
  maxPlaces: number,
  field: string,
): void {
  const [, decimals = ''] = value.split('.');

  if (decimals.length > maxPlaces) {
    throw new Error(
      `MEXC ${field} exceeds maximum precision of ${maxPlaces} decimal places`,
    );
  }
}

function decimalPlaces(value: string): number {
  const [, decimals = ''] = value.split('.');
  return decimals.length;
}

}