import type { ExchangeOrderRequest } from '../../order/exchangeOrder';
import type { ExchangeSymbolInfo } from '../../market/exchangeMarket';

export function validateMexcOrder(
  request: ExchangeOrderRequest,
  symbolInfo: ExchangeSymbolInfo,
): void {
  validatePositiveNumber(request.quantity, 'quantity');

  if (request.type !== 'market' && request.type !== 'limit' && request.type !== 'makerOnly') {
    throw new Error(`Unsupported MEXC order type: ${request.type}`);
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

  validateDecimalPlaces(
    request.quantity,
    decimalPlaces(symbolInfo.baseSizePrecision),
    'quantity',
  );
}

function validatePositiveNumber(
  value: string,
  field: string,
): void {
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(value) || Number(value) <= 0) {
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
