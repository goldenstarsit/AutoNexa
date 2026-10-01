import type { ExchangeAdapter } from '../exchange';
import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { ExchangeAccount } from '../../domain/exchange/exchangeAccount';
import type { ExchangeBalanceMode } from '../account/balanceMode';
import { TestBalanceService } from '../account/testBalanceService';
import type { TestBalanceOperations } from '../account/testBalanceOperations';
import { BalanceSourceRouter } from '../account/balanceSourceRouter';
import type { BalanceSource } from '../account/balanceSource';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type { ExchangeSymbolInfo } from '../market/exchangeMarket';
import type { ExchangeTradingRules } from '../../domain/exchange/exchangeTradingRules';
import type { ExchangeCapabilities } from '../exchangeCapabilities';
import type { ExchangeHealth } from '../exchangeHealth';
import { MexcAccountApi } from './mexc/mexcAccountApi';
import { MexcOrderApi } from './mexc/mexcOrderApi';
import { MexcMarketApi } from './mexc/mexcMarketApi';
import { MexcTickerApi } from './mexc/mexcTickerApi';
import { mapDefinedMexcSymbolInfo, mapMexcSymbolInfo } from './mexc/mexcMarketMapper';
import { OrderExecutionService } from '../order/orderExecutionService';
import type { ExecutionModeProvider } from '../../domain/execution/executionModeProvider';
import { MexcLiveBalanceSource } from '../account/sources/mexcLiveBalanceSource';
import { MexcPrivateApiClient } from './mexc/mexcPrivateApiClient';
import { TestOrderExecutionService } from '../order/testOrderExecutionService';

export class MexcExchangeAdapter implements ExchangeAdapter {
  readonly id = 'mexc';

  constructor(
    db: DatabaseModel,
    executionModeProvider?: ExecutionModeProvider,
  ) {
    this.testBalanceSource = new TestBalanceService(db, this.id);

    this.balanceSourceRouter = new BalanceSourceRouter(
      new Map<ExchangeBalanceMode, BalanceSource>([
        ['live', this.liveBalanceSource],
        ['test', this.testBalanceSource],
      ]),
    );

    this.orderExecutionService = new OrderExecutionService(
      this.orderApi,
      executionModeProvider,
    );
    this.testOrderExecutionService = new TestOrderExecutionService(
      db,
      this.id,
      {
        getCurrentPrice: (symbol) => this.getCurrentPrice(symbol),
        getSymbolInfo: async (symbol) => {
          const info = await this.getSymbolInfo(symbol);
          if (!info) {
            throw new Error(`MEXC symbol not found: ${symbol}`);
          }
          return info;
        },
      },
    );
  }
  readonly name = 'MEXC';

  private readonly privateApiClient = new MexcPrivateApiClient();

  private readonly accountApi = new MexcAccountApi(
    this.privateApiClient,
  );

  private readonly liveBalanceSource = new MexcLiveBalanceSource(
    this.accountApi,
  );

  private readonly testBalanceSource: BalanceSource & TestBalanceOperations;
  private readonly balanceSourceRouter: BalanceSourceRouter;

  private readonly marketApi = new MexcMarketApi();
  private readonly tickerApi = new MexcTickerApi();

  private readonly orderApi = new MexcOrderApi(
    this.privateApiClient,
    this.marketApi,
  );

  private readonly orderExecutionService: OrderExecutionService;
  private readonly testOrderExecutionService: TestOrderExecutionService;

  private health: ExchangeHealth = {
    state: 'disconnected',
    checkedAt: Date.now(),
  };

  async connect(): Promise<void> {
    this.health = {
      state: 'connecting',
      checkedAt: Date.now(),
    };

    try {
      await this.marketApi.getExchangeInfo();

      this.health = {
        state: 'connected',
        checkedAt: Date.now(),
      };
    } catch (error) {
      this.health = {
        state: 'error',
        checkedAt: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.health = {
      state: 'disconnected',
      checkedAt: Date.now(),
    };
  }

  async getAccount(mode: ExchangeBalanceMode = 'live'): Promise<ExchangeAccount> {
    return this.balanceSourceRouter.getAccount(mode);
  }

  depositTestBalance(
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void {
    this.testBalanceSource.depositTestBalance(asset, amount, updatedAt);
  }

  withdrawTestBalance(
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void {
    this.testBalanceSource.withdrawTestBalance(asset, amount, updatedAt);
  }

  async placeOrder(
    request: ExchangeOrderRequest,
    mode: ExchangeBalanceMode = 'live',
  ): Promise<ExchangeOrder> {
    if (mode === 'test') {
      return this.testOrderExecutionService.execute(request);
    }

    return this.orderExecutionService.execute(request);
  }

  async getOrder(symbol: string, orderId: string): Promise<ExchangeOrder> {
    return this.orderApi.getOrder(symbol, orderId);
  }

  async getOrderTrades(
    symbol: string,
    orderId: string,
    mode: ExchangeBalanceMode = 'live',
  ): Promise<ExchangeTrade[]> {
    if (mode === 'test') {
      return this.testOrderExecutionService.getTrades(symbol, orderId);
    }

    return this.orderApi.getOrderTrades(symbol, orderId);
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
    return mapMexcSymbolInfo(await this.marketApi.getSymbolInfo(symbol));
  }

  async getSymbols(): Promise<ExchangeSymbolInfo[]> {
    const info = await this.marketApi.getExchangeInfo();

    return info.symbols.map((symbol) => mapDefinedMexcSymbolInfo(symbol));
  }

  async getHealth(): Promise<ExchangeHealth> {
    return { ...this.health };
  }

  async getCapabilities(): Promise<ExchangeCapabilities> {
    const symbols = await this.marketApi.getExchangeInfo();

    return {
      spotTrading: symbols.symbols.some(
        (symbol) => symbol.isSpotTradingAllowed,
      ),
      marginTrading: symbols.symbols.some(
        (symbol) => symbol.isMarginTradingAllowed,
      ),
      makerExecution: this.orderApi.executionCapabilities.maker,
      takerExecution: this.orderApi.executionCapabilities.taker,
      hybridExecution: this.orderApi.executionCapabilities.hybrid,
      orderTypes: [
        ...new Set(
          symbols.symbols.flatMap((symbol) => symbol.orderTypes),
        ),
      ],
    };
  }

  async getCurrentPrice(symbol: string): Promise<string> {
    const ticker = await this.tickerApi.getPrice(symbol);

    if (!ticker.price || ticker.price === '0') {
      throw new Error(`Current price is unavailable: ${this.id}:${symbol}`);
    }

    return ticker.price;
  }

  async getTradingRules(
    symbol: string,
  ): Promise<ExchangeTradingRules | undefined> {
    const info = await this.getSymbolInfo(symbol);

    if (!info) {
      return undefined;
    }

    return {
      symbol: info.symbol,
      status: info.status,
      orderTypes: info.orderTypes,
      spotTradingAllowed: info.spotTradingAllowed,
      marginTradingAllowed: info.marginTradingAllowed,
      baseAssetPrecision: info.baseAssetPrecision,
      quotePrecision: info.quotePrecision,
      quoteAssetPrecision: info.quoteAssetPrecision,
      baseCommissionPrecision: info.baseCommissionPrecision,
      quoteCommissionPrecision: info.quoteCommissionPrecision,
      quoteAmountPrecision: info.quoteAmountPrecision,
      baseSizePrecision: info.baseSizePrecision,
      maxQuoteAmount: info.maxQuoteAmount,
      quoteAmountPrecisionMarket: info.quoteAmountPrecisionMarket,
      maxQuoteAmountMarket: info.maxQuoteAmountMarket,
    };
  }
}
