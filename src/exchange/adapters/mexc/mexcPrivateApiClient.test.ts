import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ExchangeHttpClient,
  ExchangeHttpRequest,
  ExchangeHttpResponse,
} from '../../http/exchangeHttpClient';
import { MexcPrivateApiClient } from './mexcPrivateApiClient';

class TestHttpClient implements ExchangeHttpClient {
  readonly requests: ExchangeHttpRequest[] = [];

  async request<T>(request: ExchangeHttpRequest): Promise<ExchangeHttpResponse<T>> {
    this.requests.push(request);

    if (request.path === '/api/v3/time') {
      return {
        data: {
          serverTime: Date.now() + 10_000,
        },
        status: 200,
      } as ExchangeHttpResponse<T>;
    }

    return {
      data: {} as T,
      status: 200,
    };
  }
}

test('MexcPrivateApiClient synchronizes signed timestamps with MEXC server time', async () => {
  const httpClient = new TestHttpClient();
  const client = new MexcPrivateApiClient(httpClient);

  await client.request('GET', '/api/v3/account');

  const timeRequests = httpClient.requests.filter(
    (request) => request.path === '/api/v3/time',
  );

  assert.equal(timeRequests.length, 1);

  const privateRequest = httpClient.requests.find(
    (request) => request.path === '/api/v3/account',
  );

  assert.ok(privateRequest);

  const timestamp = Number(privateRequest.query?.timestamp);

  assert.ok(Number.isFinite(timestamp));
  assert.ok(Math.abs(timestamp - (Date.now() + 10_000)) < 2_000);
});
