import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExchangeOrder } from '../../../domain/exchange/exchangeOrder';
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

type Call = {
  method: string;
  path: string;
  params: Record<string, unknown>;
};

function createApi(calls: Call[]) {
  const privateApiClient = {
    async request<T>(
      method: 'GET' | 'POST' | 'DELETE',
      path: string,
      params: Record<string, string | number | boolean>,
    ): Promise<T> {
      calls.push({ method, path, params });

      if (path === '/api/v3/myTrades') {
        return [
          {
            id: 'trade-1',
            orderId: '123',
            symbol: 'BTCUSDT',
            price: '90000.00',
            qty: '0.000012',
            quoteQty: '1.08',
            time: 1700000000000,
            isBuyer: true,
          },
        ] as T;
      }

      if (path === '/api/v3/openOrders' || path === '/api/v3/allOrders') {
        return [
          {
            symbol: 'BTCUSDT',
            orderId: '123',
            clientOrderId: 'client-1',
            price: '90000.00',
            origQty: '0.000012',
            executedQty: '0.000012',
            status: 'FILLED',
            type: 'LIMIT_MAKER',
            side: 'SELL',
          },
        ] as T;
      }

      return {
        symbol: 'BTCUSDT',
        orderId: '123',
        clientOrderId: 'client-1',
        price: '90000.00',
        origQty: '0.000012',
        executedQty: '0.000012',
        status: 'FILLED',
        type: 'LIMIT_MAKER',
        side: 'SELL',
      } as T;
    },
  };

  const marketApi = {
    async getSymbolInfo() {
      return symbolInfo;
    },
  };

  return new MexcOrderApi(
    privateApiClient as never,
    marketApi as never,
  );
}

function assertOrder(order: ExchangeOrder) {
  assert.deepEqual(order, {
    orderId: '123',
    clientOrderId: 'client-1',
    symbol: 'BTCUSDT',
    side: 'sell',
    type: 'makerOnly',
    status: 'filled',
    quantity: '0.000012',
    executedQuantity: '0.000012',
    price: '90000.00',
  });
}

test('getOrder maps MEXC order response and parameters', async () => {
  const calls: Call[] = [];
  const api = createApi(calls);

  const order = await api.getOrder('btcusdt', '123');

  assertOrder(order);
  assert.deepEqual(calls, [
    {
      method: 'GET',
      path: '/api/v3/order',
      params: {
        symbol: 'BTCUSDT',
        orderId: '123',
      },
    },
  ]);
});

test('getOrderTrades maps trade fills and parameters', async () => {
  const calls: Call[] = [];
  const api = createApi(calls);

  const trades = await api.getOrderTrades('btcusdt', '123');

  assert.deepEqual(trades, [
    {
      tradeId: 'trade-1',
      orderId: '123',
      symbol: 'BTCUSDT',
      side: 'buy',
      price: '90000.00',
      quantity: '0.000012',
      quoteQuantity: '1.08',
      timestamp: 1700000000000,
    },
  ]);
  assert.deepEqual(calls[0], {
    method: 'GET',
    path: '/api/v3/myTrades',
    params: {
      symbol: 'BTCUSDT',
      orderId: '123',
    },
  });
});

test('getOpenOrders maps orders and supports symbol filter', async () => {
  const calls: Call[] = [];
  const api = createApi(calls);

  const orders = await api.getOpenOrders('btcusdt');

  assert.equal(orders.length, 1);
  assertOrder(orders[0]);
  assert.deepEqual(calls[0], {
    method: 'GET',
    path: '/api/v3/openOrders',
    params: {
      symbol: 'BTCUSDT',
    },
  });
});

test('cancelOrder maps response and sends DELETE request', async () => {
  const calls: Call[] = [];
  const api = createApi(calls);

  const order = await api.cancelOrder('btcusdt', '123');

  assertOrder(order);
  assert.deepEqual(calls[0], {
    method: 'DELETE',
    path: '/api/v3/order',
    params: {
      symbol: 'BTCUSDT',
      orderId: '123',
    },
  });
});

test('getOrderHistory forwards time range and limit', async () => {
  const calls: Call[] = [];
  const api = createApi(calls);

  const orders = await api.getOrderHistory('btcusdt', {
    startTime: 1700000000000,
    endTime: 1700003600000,
    limit: 100,
  });

  assert.equal(orders.length, 1);
  assertOrder(orders[0]);
  assert.deepEqual(calls[0], {
    method: 'GET',
    path: '/api/v3/allOrders',
    params: {
      symbol: 'BTCUSDT',
      startTime: 1700000000000,
      endTime: 1700003600000,
      limit: 100,
    },
  });
});
