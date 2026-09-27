import type { ExchangeHttpClient } from '../../http/exchangeHttpClient';
import { FetchExchangeHttpClient } from '../../http/fetchExchangeHttpClient';
import { getMexcCredentials } from '../../../config/exchangeCredentials';
import { MexcPrivateRequestBuilder } from './mexcPrivateRequest';
import { MexcSigner } from './mexcSigner';
import { MEXC_API_CONFIG } from './mexcApiConfig';
import { InMemoryExchangeRateLimiter } from '../../inMemoryExchangeRateLimiter';
import type { ExchangeRateLimiter } from '../../exchangeRateLimit';

export class MexcPrivateApiClient {
  private readonly httpClient: ExchangeHttpClient;
  private readonly requestBuilder: MexcPrivateRequestBuilder;
  private readonly rateLimiter: ExchangeRateLimiter;

  constructor(
    httpClient: ExchangeHttpClient = new FetchExchangeHttpClient(
      MEXC_API_CONFIG.baseUrl,
    ),
    rateLimiter: ExchangeRateLimiter = new InMemoryExchangeRateLimiter({
      maxRequests: 10,
      windowMs: 1000,
    }),
  ) {
    const credentials = getMexcCredentials();

    this.httpClient = httpClient;
    this.rateLimiter = rateLimiter;
    this.requestBuilder = new MexcPrivateRequestBuilder(
      credentials.apiKey,
      new MexcSigner(credentials.apiSecret),
    );
  }

  async request<T = unknown>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    params: Record<string, string | number | boolean> = {},
  ): Promise<T> {
    if (!this.rateLimiter.canRequest()) {
      const state = this.rateLimiter.getState();
      const resetAt = state.resetAt ?? Date.now();

      throw new Error(
        `MEXC rate limit exceeded; retry after ${Math.max(
          0,
          resetAt - Date.now(),
        )}ms`,
      );
    }

    this.rateLimiter.recordRequest();

    const signedRequest = this.requestBuilder.build(params);

    const response = await this.httpClient.request<T>({
      method,
      path,
      query: {
        ...Object.fromEntries(
          new URLSearchParams(signedRequest.queryString),
        ),
        signature: signedRequest.signature,
      },
      headers: {
        'X-MEXC-APIKEY': signedRequest.apiKey,
      },
    });

    return response.data;
  }
}
