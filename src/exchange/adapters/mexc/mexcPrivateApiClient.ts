import type { ExchangeHttpClient } from '../../http/exchangeHttpClient';
import { FetchExchangeHttpClient } from '../../http/fetchExchangeHttpClient';
import { getMexcCredentials } from '../../../config/exchangeCredentials';
import { MexcPrivateRequestBuilder } from './mexcPrivateRequest';
import { MexcSigner } from './mexcSigner';
import { MEXC_API_CONFIG } from './mexcApiConfig';

export class MexcPrivateApiClient {
  private readonly httpClient: ExchangeHttpClient;
  private readonly requestBuilder: MexcPrivateRequestBuilder;

  constructor(
    httpClient: ExchangeHttpClient = new FetchExchangeHttpClient(
      MEXC_API_CONFIG.baseUrl,
    ),
  ) {
    const credentials = getMexcCredentials();

    this.httpClient = httpClient;
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
