import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { BalanceModeModel } from '../../domain/balance/balanceModeModel';
import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../domain/exchange/exchangeOrder';
import { calculateTradeFillTotals } from '../../exchange/trade/exchangeTradeFillCalculator';
import type { DcaCycleModel } from '../../domain/strategy/dca/dcaCycleModel';
import { DcaCycleRepository } from './dcaCycleRepository';
import { DcaCycleModelSelector } from './models/dcaCycleModelSelector';
import { DcaTradingRuleResolver } from './dcaTradingRuleResolver';

export interface DcaInitialOrderPreparation {
  configurationId: string;
  symbol: string;
  exchange: ExchangeModel;
  balanceMode: BalanceModeModel['id'];
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
  private readonly getConfigurationModel: (
    configurationId: string,
  ) => DcaConfigurationModel | undefined;
  private readonly tradingRuleResolver: DcaTradingRuleResolver;
  private readonly cycleModels: DcaCycleModelSelector;

  constructor(
    private readonly db: DatabaseModel,
    getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.getConfigurationModel = getConfigurationModel;
    this.tradingRuleResolver = new DcaTradingRuleResolver();
    this.cycleModels = new DcaCycleModelSelector(
      new DcaCycleRepository(db),
    );
  }

  async prepare(
    configurationId: string,
  ): Promise<DcaInitialOrderPreparation> {
    const configuration =
      this.getConfigurationModel(configurationId);

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

    const executionMode = configuration.executionMode.id;


    const rules = await this.tradingRuleResolver.resolve(
      configuration.exchange,
      configuration.symbol,
    );

    const exchange = configuration.exchange;
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
      exchange,
      balanceMode: configuration.balanceMode.id,
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

    const exchange = preparation.exchange;

    return exchange.placeOrder(
      preparation.request,
      preparation.balanceMode,
    );
  }

  async startCycleAndExecute(
    configurationId: string,
  ): Promise<DcaInitialOrderExecution> {
    const cycle = this.cycleModels.start(configurationId);

    try {
      const preparation = await this.prepare(configurationId);
      const exchange = preparation.exchange;

      const order = await exchange.placeOrder(
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

      const trades = await exchange.getOrderTrades(
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

      const activeCycle = cycle.recordInitialEntryPrice(initialEntry);

      return {
        cycleId: activeCycle.id,
        order,
        trades,
        initialEntryPrice: initialEntry.averagePrice,
      };
    } catch (error) {
      this.cycleModels.get(cycle.id)?.stop();
      throw error;
    }
  }

  private isZeroOrNegative(value: string): boolean {
    return value.trim() === '' || /^0+(?:\.0+)?$/.test(value.trim());
  }
}
