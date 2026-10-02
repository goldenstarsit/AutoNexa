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
    quotePrecision: number;
    quoteAssetPrecision: number;
    baseCommissionPrecision: number;
    quoteCommissionPrecision: number;
    orderTypes: string[];
    isSpotTradingAllowed: boolean;
    isMarginTradingAllowed: boolean;
    quoteAmountPrecision: string;
    baseSizePrecision: string;
    maxQuoteAmount: string;
    quoteAmountPrecisionMarket: string;
    maxQuoteAmountMarket: string;
  }>;
}

export class MexcMarketApi {
  private readonly httpClient: ExchangeHttpClient;
  private exchangeInfo?: MexcExchangeInfoResponse;
  private exchangeInfoRequest?: Promise<MexcExchangeInfoResponse>;

  constructor(
    httpClient: ExchangeHttpClient = new FetchExchangeHttpClient(
      MEXC_API_CONFIG.baseUrl,
    ),
  ) {
    this.httpClient = httpClient;
  }

  async getExchangeInfo(): Promise<MexcExchangeInfoResponse> {
    if (this.exchangeInfo) {
      return this.exchangeInfo;
    }

    if (!this.exchangeInfoRequest) {
      this.exchangeInfoRequest = this.httpClient
        .request<MexcExchangeInfoResponse>({
          method: 'GET',
          path: '/api/v3/exchangeInfo',
        })
        .then((response) => {
          this.exchangeInfo = response.data;
          return this.exchangeInfo;
        })
        .finally(() => {
          this.exchangeInfoRequest = undefined;
        });
    }

    return this.exchangeInfoRequest;
  }


  invalidateExchangeInfo(): void {
    this.exchangeInfo = undefined;
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
