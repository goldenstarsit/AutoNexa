import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExchangeOrderRequest } from '../../../domain/exchange/exchangeOrder';
import type { ExchangeSymbolInfo } from '../../market/exchangeMarket';
import { validateMexcOrder } from './mexcOrderValidator';

const symbolInfo: ExchangeSymbolInfo = {
  symbol: 'BTCUSDT',
  status: 'TRADING',
  baseAsset: 'BTC',
  quoteAsset: 'USDT',
  baseAssetPrecision: 6,
  quotePrecision: 2,
  quoteAssetPrecision: 8,
  baseCommissionPrecision: 6,
  quoteCommissionPrecision: 8,
  baseSizePrecision: '0.000001',
  quoteAmountPrecision: '1',
  quoteAmountPrecisionMarket: '1',
  maxQuoteAmount: '4000000',
  maxQuoteAmountMarket: '4000000',
  orderTypes: ['LIMIT', 'MARKET', 'LIMIT_MAKER'],
  spotTradingAllowed: true,
  marginTradingAllowed: false,
};

function request(
  overrides: Partial<ExchangeOrderRequest> = {},
): ExchangeOrderRequest {
  return {
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    executionMode: 'takerOnly',
    quantity: '0.000012',
    ...overrides,
  };
}

test('accepts market order at minimum market notional', () => {
  assert.doesNotThrow(() =>
    validateMexcOrder(request(), symbolInfo, '83333.3333333334'),
  );
});

test('rejects market order below minimum market notional', () => {
  assert.throws(
    () => validateMexcOrder(request({ quantity: '0.000011' }), symbolInfo, '83333.3333333333'),
    /MEXC market order value must be at least 1/,
  );
});

test('rejects market order above maximum market notional', () => {
  assert.throws(
    () => validateMexcOrder(request({ quantity: '0.001001' }), symbolInfo, '4000000000'),
    /MEXC market order value must not exceed 4000000/,
  );
});

test('rejects market order without reference price', () => {
  assert.throws(
    () => validateMexcOrder(request(), symbolInfo),
    /MEXC market order requires a market reference price/,
  );
});

test('keeps limit order price and notional validation', () => {
  assert.doesNotThrow(() =>
    validateMexcOrder(
      request({
        type: 'limit',
        executionMode: 'makerOnly',
        quantity: '0.000012',
        price: '90000.00',
      }),
      symbolInfo,
    ),
  );
});
