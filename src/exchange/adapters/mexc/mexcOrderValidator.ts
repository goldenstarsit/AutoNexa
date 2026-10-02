import type { ExchangeOrderRequest } from '../../../domain/exchange/exchangeOrder';
import type { ExchangeSymbolInfo } from '../../market/exchangeMarket';
import {
  compareDecimalAmounts,
  multiplyDecimalAmounts,
} from '../../account/decimalAmount';

export function validateMexcOrder(
  request: ExchangeOrderRequest,
  symbolInfo: ExchangeSymbolInfo,
  marketReferencePrice?: string,
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
  validatePositiveNumber(
    symbolInfo.quoteAmountPrecisionMarket,
    'quoteAmountPrecisionMarket',
  );

  if (symbolInfo.maxQuoteAmount) {
    validatePositiveNumber(symbolInfo.maxQuoteAmount, 'maxQuoteAmount');
  }

  if (symbolInfo.maxQuoteAmountMarket) {
    validatePositiveNumber(
      symbolInfo.maxQuoteAmountMarket,
      'maxQuoteAmountMarket',
    );
  }

  validateDecimalPlaces(
    request.quantity,
    decimalPlaces(symbolInfo.baseSizePrecision),
    'quantity',
  );

  if (compareDecimalAmounts(request.quantity, symbolInfo.baseSizePrecision) < 0) {
    throw new Error(
      `MEXC quantity must be at least ${symbolInfo.baseSizePrecision}`,
    );
  }

  if (!isDecimalMultiple(request.quantity, symbolInfo.baseSizePrecision)) {
    throw new Error(
      `MEXC quantity must be a multiple of ${symbolInfo.baseSizePrecision}`,
    );
  }

  const notionalPrice =
    request.type === 'market' ? marketReferencePrice : request.price;

  if (request.type === 'market' && notionalPrice === undefined) {
    throw new Error(
      'MEXC market order requires a market reference price for validation',
    );
  }

  if (notionalPrice !== undefined) {
    validatePositiveNumber(notionalPrice, 'reference price');

    const notional = multiplyDecimalAmounts(
      request.quantity,
      notionalPrice,
    );

    const minimumNotional =
      request.type === 'market'
        ? symbolInfo.quoteAmountPrecisionMarket
        : symbolInfo.quoteAmountPrecision;

    const maximumNotional =
      request.type === 'market'
        ? symbolInfo.maxQuoteAmountMarket
        : symbolInfo.maxQuoteAmount;

    if (compareDecimalAmounts(notional, minimumNotional) < 0) {
      throw new Error(
        `MEXC ${request.type} order value must be at least ${minimumNotional}`,
      );
    }

    if (
      maximumNotional &&
      compareDecimalAmounts(notional, maximumNotional) > 0
    ) {
      throw new Error(
        `MEXC ${request.type} order value must not exceed ${maximumNotional}`,
      );
    }
  }
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

function validatePositiveNumber(
  value: string,
  field: string,
): void {
  if (
    !/^(?:\d+\.?\d*|\.\d+)$/.test(value) ||
    compareDecimalAmounts(value, '0') <= 0
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
