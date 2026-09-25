import type { ExchangeHttpClient } from '../../http/exchangeHttpClient';
import { FetchExchangeHttpClient } from '../../http/fetchExchangeHttpClient';
import { MEXC_API_CONFIG } from './mexcApiConfig';

export interface MexcServerTimeResponse {
  serverTime: number;
}

export class MexcApiClient {
  private readonly httpClient: ExchangeHttpClient;

  constructor(
    httpClient: ExchangeHttpClient = new FetchExchangeHttpClient(
      MEXC_API_CONFIG.baseUrl,
    ),
  ) {
    this.httpClient = httpClient;
  }

  async getServerTime(): Promise<MexcServerTimeResponse> {
    const response = await this.httpClient.request<MexcServerTimeResponse>({
      method: 'GET',
      path: '/api/v3/time',
    });

    return response.data;
  }
}
