import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExchangeOrderRequest } from '../../../domain/exchange/exchangeOrder';
import type { MexcExchangeInfoResponse } from './mexcMarketApi';
import { MexcOrderApi } from './mexcOrderApi';

const symbolInfo: MexcExchangeInfoResponse['symbols'][number] = {
  symbol: 'BTCUSDT',
  status: 'TRADING',
  baseAsset: 'BTC',
  quoteAsset: 'USDT',
  baseAssetPrecision: 6,
  quotePrecision: 2,
  quoteAssetPrecision: 8,
  baseCommissionPrecision: 6,
  quoteCommissionPrecision: 8,
  orderTypes: ['LIMIT', 'MARKET', 'LIMIT_MAKER'],
  isSpotTradingAllowed: true,
  isMarginTradingAllowed: false,
  quoteAmountPrecision: '1',
  baseSizePrecision: '0.000001',
  maxQuoteAmount: '4000000',
  quoteAmountPrecisionMarket: '1',
  maxQuoteAmountMarket: '4000000',
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

function createApi(responseCalls: Array<Record<string, unknown>>) {
  const privateApiClient = {
    async request<T>(
      method: 'GET' | 'POST' | 'DELETE',
      path: string,
      params: Record<string, string | number | boolean>,
    ): Promise<T> {
      responseCalls.push({ method, path, params });
      return {
        symbol: 'BTCUSDT',
        orderId: '123',
        clientOrderId: 'client-1',
        price: '83333.33',
        origQty: '0.000012',
        executedQty: '0.000012',
        status: 'FILLED',
        type: 'MARKET',
        side: 'BUY',
      } as T;
    },
  };

  const marketApi = {
    async getSymbolInfo() {
      return symbolInfo;
    },
  };

  const bookTickerApi = {
    async getBookTicker() {
      return {
        symbol: 'BTCUSDT',
        bidPrice: '83332',
        bidQty: '1',
        askPrice: '83333.34',
        askQty: '1',
      };
    },
  };

  return new MexcOrderApi(
    privateApiClient as never,
    marketApi as never,
    bookTickerApi as never,
  );
}

test('market BUY validates against best ask before submitting', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const api = createApi(calls);

  const order = await api.placeOrder(request());

  assert.equal(order.orderId, '123');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].path, '/api/v3/order');
  assert.equal(calls[1].method, 'GET');
  assert.equal(calls[1].path, '/api/v3/order');
  assert.deepEqual(calls[0].params, {
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'MARKET',
    quantity: '0.000012',
  });
});

test('market SELL validates against best bid before submitting', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const api = createApi(calls);

  await assert.doesNotReject(() =>
    api.placeOrder(
      request({
        side: 'sell',
        quantity: '0.000013',
      }),
    ),
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[0].params && typeof calls[0].params === 'object'
    ? (calls[0].params as Record<string, unknown>).side
    : undefined, 'SELL');
});

test('market order below estimated minimum is rejected before POST', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const api = createApi(calls);

  await assert.rejects(
    () =>
      api.placeOrder(
        request({
          quantity: '0.000011',
        }),
      ),
    /MEXC market order value must be at least 1/,
  );

  assert.equal(calls.length, 0);
});

test('limit order sends price and does not request book ticker', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const api = createApi(calls);

  const order = await api.placeOrder(
    request({
      type: 'limit',
      executionMode: 'makerOnly',
      quantity: '0.000012',
      price: '90000.00',
    }),
  );

  assert.equal(order.orderId, '123');
  assert.deepEqual(calls[0].params, {
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'LIMIT',
    quantity: '0.000012',
    price: '90000.00',
  });
});
