import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExchangeHttpClient } from '../../http/exchangeHttpClient';
import type {
  ExchangeHttpRequest,
  ExchangeHttpResponse,
} from '../../http/exchangeHttpClient';
import { MexcMarketApi } from './mexcMarketApi';
import type { MexcExchangeInfoResponse } from './mexcMarketApi';

const createResponse = (
  serverTime: number,
): ExchangeHttpResponse<MexcExchangeInfoResponse> => ({
  status: 200,
  data: {
    timezone: 'UTC',
    serverTime,
    symbols: [
      {
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
      },
    ],
  },
});

class MockHttpClient implements ExchangeHttpClient {
  readonly requests: ExchangeHttpRequest[] = [];
  private readonly responses: Array<
    ExchangeHttpResponse<MexcExchangeInfoResponse>
  >;

  constructor(
    responses: Array<ExchangeHttpResponse<MexcExchangeInfoResponse>>,
  ) {
    this.responses = responses;
  }

  async request<T>(
    request: ExchangeHttpRequest,
  ): Promise<ExchangeHttpResponse<T>> {
    this.requests.push(request);

    const response = this.responses.shift();

    if (!response) {
      throw new Error('No mock response available');
    }

    return response as ExchangeHttpResponse<T>;
  }
}

test('getExchangeInfo caches the successful response', async () => {
  const httpClient = new MockHttpClient([
    createResponse(1),
    createResponse(2),
  ]);
  const api = new MexcMarketApi(httpClient);

  const first = await api.getExchangeInfo();
  const second = await api.getExchangeInfo();

  assert.equal(first.serverTime, 1);
  assert.strictEqual(second, first);
  assert.equal(httpClient.requests.length, 1);
  assert.deepEqual(httpClient.requests[0], {
    method: 'GET',
    path: '/api/v3/exchangeInfo',
  });
});

test('concurrent getExchangeInfo calls share one request', async () => {
  let resolveRequest:
    | ((response: ExchangeHttpResponse<MexcExchangeInfoResponse>) => void)
    | undefined;

  const httpClient: ExchangeHttpClient = {
    request: async <T>(request: ExchangeHttpRequest) => {
      void request;

      return new Promise<ExchangeHttpResponse<T>>((resolve) => {
        resolveRequest = (response) => resolve(response as ExchangeHttpResponse<T>);
      });
    },
  };

  const api = new MexcMarketApi(httpClient);

  const firstPromise = api.getExchangeInfo();
  const secondPromise = api.getExchangeInfo();

  assert.equal(typeof resolveRequest, 'function');

  resolveRequest!(createResponse(10));

  const [first, second] = await Promise.all([
    firstPromise,
    secondPromise,
  ]);

  assert.strictEqual(first, second);
});

test('getSymbolInfo normalizes the symbol to uppercase', async () => {
  const httpClient = new MockHttpClient([createResponse(1)]);
  const api = new MexcMarketApi(httpClient);

  const symbol = await api.getSymbolInfo('btcusdt');

  assert.equal(symbol?.symbol, 'BTCUSDT');
  assert.equal(httpClient.requests.length, 1);
});

test('failed exchange info requests are not cached', async () => {
  let attempts = 0;

  const httpClient: ExchangeHttpClient = {
    request: async <T>() => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error('temporary failure');
      }

      return createResponse(20) as ExchangeHttpResponse<T>;
    },
  };

  const api = new MexcMarketApi(httpClient);

  await assert.rejects(
    api.getExchangeInfo(),
    /temporary failure/,
  );

  const response = await api.getExchangeInfo();

  assert.equal(response.serverTime, 20);
  assert.equal(attempts, 2);
});

test('invalidateExchangeInfo forces the next request to refresh the cache', async () => {
  const httpClient = new MockHttpClient([
    createResponse(1),
    createResponse(2),
  ]);
  const api = new MexcMarketApi(httpClient);

  const first = await api.getExchangeInfo();

  api.invalidateExchangeInfo();

  const second = await api.getExchangeInfo();

  assert.equal(first.serverTime, 1);
  assert.equal(second.serverTime, 2);
  assert.notStrictEqual(second, first);
  assert.equal(httpClient.requests.length, 2);
});
