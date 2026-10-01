import type { ExchangeHttpClient } from '../../http/exchangeHttpClient';
import { FetchExchangeHttpClient } from '../../http/fetchExchangeHttpClient';
import { MEXC_API_CONFIG } from './mexcApiConfig';

export interface MexcBookTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}

export class MexcBookTickerApi {
  private readonly httpClient: ExchangeHttpClient;

  constructor(
    httpClient: ExchangeHttpClient = new FetchExchangeHttpClient(
      MEXC_API_CONFIG.baseUrl,
    ),
  ) {
    this.httpClient = httpClient;
  }

  async getBookTicker(symbol: string): Promise<MexcBookTicker> {
    const response = await this.httpClient.request<MexcBookTicker>({
      method: 'GET',
      path: '/api/v3/ticker/bookTicker',
      query: {
        symbol: symbol.toUpperCase(),
      },
    });

    return response.data;
  }
}
