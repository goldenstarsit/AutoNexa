import type { ExchangeHttpClient } from '../../http/exchangeHttpClient';
import { FetchExchangeHttpClient } from '../../http/fetchExchangeHttpClient';
import { MEXC_API_CONFIG } from './mexcApiConfig';

export interface MexcExchangeInfoResponse {
  timezone: string;
  serverTime: number;
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetPrecision: number;
    quoteAssetPrecision: number;
  }>;
}

export class MexcMarketApi {
  private readonly httpClient: ExchangeHttpClient;

  constructor(
    httpClient: ExchangeHttpClient = new FetchExchangeHttpClient(
      MEXC_API_CONFIG.baseUrl,
    ),
  ) {
    this.httpClient = httpClient;
  }

  async getExchangeInfo(): Promise<MexcExchangeInfoResponse> {
    const response =
      await this.httpClient.request<MexcExchangeInfoResponse>({
        method: 'GET',
        path: '/api/v3/exchangeInfo',
      });

    return response.data;
  }

  async getSymbolInfo(
    symbol: string,
  ): Promise<MexcExchangeInfoResponse['symbols'][number] | undefined> {
    const info = await this.getExchangeInfo();

    return info.symbols.find(
      (item) => item.symbol === symbol.toUpperCase(),
    );
  }
}
