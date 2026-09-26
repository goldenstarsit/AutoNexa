import type { ExchangeAdapter } from '../exchange';
import type { ExchangeAccount } from '../account/exchangeAccount';
import type { ExchangeOrder, ExchangeOrderRequest } from '../order/exchangeOrder';
import type { ExchangeSymbolInfo } from '../market/exchangeMarket';
import { MexcAccountApi } from './mexc/mexcAccountApi';
import { MexcOrderApi } from './mexc/mexcOrderApi';
import { MexcMarketApi } from './mexc/mexcMarketApi';
import { OrderExecutionService } from '../order/orderExecutionService';
import { MexcPrivateApiClient } from './mexc/mexcPrivateApiClient';

export class MexcExchangeAdapter implements ExchangeAdapter {
  readonly id = 'mexc';
  readonly name = 'MEXC';

  private readonly privateApiClient = new MexcPrivateApiClient();

  private readonly accountApi = new MexcAccountApi(
    this.privateApiClient,
  );

  private readonly orderApi = new MexcOrderApi(
    this.privateApiClient,
  );

  private readonly marketApi = new MexcMarketApi();

  private readonly orderExecutionService = new OrderExecutionService(
    this.orderApi,
  );

  async connect(): Promise<void> {
    // Connection lifecycle will be expanded in the MEXC integration milestone.
  }

  async disconnect(): Promise<void> {
    // Connection cleanup will be expanded in the MEXC integration milestone.
  }

  async getAccount(): Promise<ExchangeAccount> {
    return this.accountApi.getAccount();
  }

  async placeOrder(request: ExchangeOrderRequest): Promise<ExchangeOrder> {
    return this.orderExecutionService.execute(request);
  }

  async getOrder(symbol: string, orderId: string): Promise<ExchangeOrder> {
    return this.orderApi.getOrder(symbol, orderId);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<ExchangeOrder> {
    return this.orderApi.cancelOrder(symbol, orderId);
  }

  async getOpenOrders(symbol?: string): Promise<ExchangeOrder[]> {
    return this.orderApi.getOpenOrders(symbol);
  }

  async getOrderHistory(
    symbol: string,
    options?: {
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<ExchangeOrder[]> {
    return this.orderApi.getOrderHistory(symbol, options);
  }

  async getSymbolInfo(
    symbol: string,
  ): Promise<ExchangeSymbolInfo | undefined> {
    const info = await this.marketApi.getSymbolInfo(symbol);

    if (!info) {
      return undefined;
    }

    return {
      symbol: info.symbol,
      status: info.status,
      baseAsset: info.baseAsset,
      quoteAsset: info.quoteAsset,
      baseAssetPrecision: info.baseAssetPrecision,
      quotePrecision: info.quotePrecision,
      quoteAssetPrecision: info.quoteAssetPrecision,
      baseCommissionPrecision: info.baseCommissionPrecision,
      quoteCommissionPrecision: info.quoteCommissionPrecision,
      orderTypes: info.orderTypes,
      spotTradingAllowed: info.isSpotTradingAllowed,
      marginTradingAllowed: info.isMarginTradingAllowed,
      quoteAmountPrecision: info.quoteAmountPrecision,
      baseSizePrecision: info.baseSizePrecision,
      maxQuoteAmount: info.maxQuoteAmount,
      quoteAmountPrecisionMarket: info.quoteAmountPrecisionMarket,
      maxQuoteAmountMarket: info.maxQuoteAmountMarket,
    };
  }

  async getSymbols(): Promise<ExchangeSymbolInfo[]> {
    const info = await this.marketApi.getExchangeInfo();

    return info.symbols.map((symbol) => ({
      symbol: symbol.symbol,
      status: symbol.status,
      baseAsset: symbol.baseAsset,
      quoteAsset: symbol.quoteAsset,
      baseAssetPrecision: symbol.baseAssetPrecision,
      quotePrecision: symbol.quotePrecision,
      quoteAssetPrecision: symbol.quoteAssetPrecision,
      baseCommissionPrecision: symbol.baseCommissionPrecision,
      quoteCommissionPrecision: symbol.quoteCommissionPrecision,
      orderTypes: symbol.orderTypes,
      spotTradingAllowed: symbol.isSpotTradingAllowed,
      marginTradingAllowed: symbol.isMarginTradingAllowed,
      quoteAmountPrecision: symbol.quoteAmountPrecision,
      baseSizePrecision: symbol.baseSizePrecision,
      maxQuoteAmount: symbol.maxQuoteAmount,
      quoteAmountPrecisionMarket: symbol.quoteAmountPrecisionMarket,
      maxQuoteAmountMarket: symbol.maxQuoteAmountMarket,
    }));
  }
}
