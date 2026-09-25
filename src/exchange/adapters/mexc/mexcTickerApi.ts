import type { ExchangeHttpClient } from '../../http/exchangeHttpClient';
import { FetchExchangeHttpClient } from '../../http/fetchExchangeHttpClient';
import { MEXC_API_CONFIG } from './mexcApiConfig';

export interface MexcTickerPrice {
  symbol: string;
  price: string;
}

export class MexcTickerApi {
  private readonly httpClient: ExchangeHttpClient;

  constructor(
    httpClient: ExchangeHttpClient = new FetchExchangeHttpClient(
      MEXC_API_CONFIG.baseUrl,
    ),
  ) {
    this.httpClient = httpClient;
  }

  async getPrice(symbol: string): Promise<MexcTickerPrice> {
    const response = await this.httpClient.request<MexcTickerPrice>({
      method: 'GET',
      path: '/api/v3/ticker/price',
      query: {
        symbol: symbol.toUpperCase(),
      },
    });

    return response.data;
  }
}
