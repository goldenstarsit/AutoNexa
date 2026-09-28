import type { ExchangeHttpClient } from '../../http/exchangeHttpClient';
import { FetchExchangeHttpClient } from '../../http/fetchExchangeHttpClient';
import { getMexcCredentials } from '../../../config/exchangeCredentials';
import { MexcPrivateRequestBuilder } from './mexcPrivateRequest';
import { MexcSigner } from './mexcSigner';
import { MEXC_API_CONFIG } from './mexcApiConfig';
import { InMemoryExchangeRateLimiter } from '../../inMemoryExchangeRateLimiter';
import type { ExchangeRateLimiter } from '../../exchangeRateLimit';
import { InMemoryExchangeRetryController } from '../../inMemoryExchangeRetryController';
import type { ExchangeRetryController } from '../../exchangeRetryPolicy';
import { normalizeExchangeError } from '../../exchangeErrorNormalizer';

export class MexcPrivateApiClient {
  private readonly httpClient: ExchangeHttpClient;
  private requestBuilder: MexcPrivateRequestBuilder | undefined;
  private readonly rateLimiter: ExchangeRateLimiter;
  private readonly retryController: ExchangeRetryController;

  constructor(
    httpClient: ExchangeHttpClient = new FetchExchangeHttpClient(
      MEXC_API_CONFIG.baseUrl,
    ),
    rateLimiter: ExchangeRateLimiter = new InMemoryExchangeRateLimiter({
      maxRequests: 10,
      windowMs: 1000,
    }),
    retryController: ExchangeRetryController =
      new InMemoryExchangeRetryController({
        maxAttempts: 3,
        delayMs: 250,
        backoffMultiplier: 2,
      }),
  ) {
    this.httpClient = httpClient;
    this.rateLimiter = rateLimiter;
    this.retryController = retryController;
  }

  async request<T = unknown>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    params: Record<string, string | number | boolean> = {},
  ): Promise<T> {
    if (!this.requestBuilder) {
      const credentials = getMexcCredentials();

      this.requestBuilder = new MexcPrivateRequestBuilder(
        credentials.apiKey,
        new MexcSigner(credentials.apiSecret),
      );
    }

    const signedRequest = this.requestBuilder.build(params);
    let attempt = 1;

    while (true) {
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

      try {
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
      } catch (error) {
        const normalizedError = normalizeExchangeError(error);
        const decision = this.retryController.shouldRetry(
          normalizedError,
          attempt,
        );

        if (!decision.retry) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, decision.delayMs),
        );

        attempt += 1;
      }
    }
  }
}
