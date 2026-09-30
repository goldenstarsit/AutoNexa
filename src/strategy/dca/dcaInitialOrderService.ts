import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { BalanceModeModelSelector } from '../../domain/balance/balanceModeModel';
import type { ExchangeModelSelector } from '../../domain/exchange/exchangeModel';
import type { ExecutionModeModelSelector } from '../../domain/execution/executionModeModel';
import type { StrategyTypeModelSelector } from '../../domain/strategy/strategyTypeModel';
import type { ExchangeTrade } from '../../exchange/trade/exchangeTrade';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../exchange/order/exchangeOrder';
import { calculateTradeFillTotals } from '../../exchange/trade/exchangeTradeFillCalculator';
import { DcaConfigurationService } from './dcaConfigurationService';
import { DcaCycleService } from './dcaCycleService';
import { DcaTradingRuleResolver } from './dcaTradingRuleResolver';

export interface DcaInitialOrderPreparation {
  configurationId: string;
  symbol: string;
  exchangeId: string;
  balanceMode: 'live' | 'test';
  executionMode: ExchangeOrderRequest['executionMode'];
  quantity: string;
  currentPrice: string;
  request: ExchangeOrderRequest;
}

export interface DcaInitialOrderExecution {
  cycleId: string;
  order: ExchangeOrder;
  trades: ExchangeTrade[];
  initialEntryPrice: string;
}

export class DcaInitialOrderService {
  private readonly configurationService: DcaConfigurationService;
  private readonly tradingRuleResolver: DcaTradingRuleResolver;
  private readonly exchanges: ExchangeModelSelector;
  private readonly cycleService: DcaCycleService;

  constructor(
    private readonly db: DatabaseAdapter,
    strategyTypes: StrategyTypeModelSelector,
    balanceModes: BalanceModeModelSelector,
    exchanges: ExchangeModelSelector,
    executionModes: ExecutionModeModelSelector,
  ) {
    this.configurationService = new DcaConfigurationService(
      db,
      strategyTypes,
      balanceModes,
      exchanges,
      executionModes,
    );
    this.tradingRuleResolver = new DcaTradingRuleResolver(exchanges);
    this.exchanges = exchanges;
    this.cycleService = new DcaCycleService(
      db,
      strategyTypes,
      balanceModes,
      exchanges,
      executionModes,
    );
  }

  async prepare(
    configurationId: string,
  ): Promise<DcaInitialOrderPreparation> {
    const configuration =
      this.configurationService.getById(configurationId);

    if (!configuration) {
      throw new Error(
        `DCA configuration not found: ${configurationId}`,
      );
    }

    if (!configuration.enabled) {
      throw new Error(
        `DCA configuration is disabled: ${configurationId}`,
      );
    }

    const executionMode = configuration.executionModeId;

    if (
      executionMode !== 'makerOnly' &&
      executionMode !== 'takerOnly' &&
      executionMode !== 'hybrid'
    ) {
      throw new Error(
        `Unsupported DCA execution mode: ${executionMode}`,
      );
    }

    const rules = await this.tradingRuleResolver.resolve(
      configuration.exchangeId,
      configuration.symbol,
    );

    const exchange = this.exchanges.get(configuration.exchangeId);
    const currentPrice = await exchange.getCurrentPrice(
      configuration.symbol,
    );

    const request: ExchangeOrderRequest = {
      symbol: configuration.symbol,
      side: 'buy',
      type: 'market',
      executionMode,
      quantity: rules.minimumQuantity,
    };

    return {
      configurationId: configuration.id,
      symbol: configuration.symbol,
      exchangeId: configuration.exchangeId,
      balanceMode: configuration.balanceModeId as 'live' | 'test',
      executionMode,
      quantity: rules.minimumQuantity,
      currentPrice,
      request,
    };
  }

  async execute(
    configurationId: string,
  ): Promise<ExchangeOrder> {
    const preparation = await this.prepare(configurationId);

    const exchange = this.exchanges.get(preparation.exchangeId);

    return exchange.adapter.placeOrder(
      preparation.request,
      preparation.balanceMode,
    );
  }

  async startCycleAndExecute(
    configurationId: string,
  ): Promise<DcaInitialOrderExecution> {
    const cycle = this.cycleService.startCycle(configurationId);

    try {
      const preparation = await this.prepare(configurationId);
      const exchange = this.exchanges.get(preparation.exchangeId);

      const order = await exchange.adapter.placeOrder(
        preparation.request,
        preparation.balanceMode,
      );

      if (order.status !== 'filled') {
        throw new Error(
          `Initial DCA order was not fully filled: ${order.orderId} (${order.status})`,
        );
      }

      if (this.isZeroOrNegative(order.executedQuantity)) {
        throw new Error(
          `Initial DCA order has no executed quantity: ${order.orderId}`,
        );
      }

      const trades = await exchange.adapter.getOrderTrades(
        order.symbol,
        order.orderId,
        preparation.balanceMode,
      );

      if (trades.length === 0) {
        throw new Error(
          `Initial DCA order has no trade fills: ${order.orderId}`,
        );
      }

      const initialEntry = calculateTradeFillTotals(trades);

      const activeCycle = this.cycleService.recordInitialEntryPrice(
        cycle.id,
        initialEntry,
      );

      return {
        cycleId: activeCycle.id,
        order,
        trades,
        initialEntryPrice: initialEntry.averagePrice,
      };
    } catch (error) {
      this.cycleService.stopCycle(cycle.id);
      throw error;
    }
  }

  private isZeroOrNegative(value: string): boolean {
    return value.trim() === '' || /^0+(?:\.0+)?$/.test(value.trim());
  }
}
