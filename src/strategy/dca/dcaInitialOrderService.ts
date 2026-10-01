import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { BalanceModeModel } from '../../domain/balance/balanceModeModel';
import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../domain/exchange/exchangeOrder';
import { calculateTradeFillTotals } from '../../exchange/trade/exchangeTradeFillCalculator';
import type {
  DcaCyclePersistenceModel,
} from '../../domain/strategy/dca/dcaCycleModel';
import type {
  DcaInitialOrderPersistenceModel,
} from '../../domain/strategy/dca/dcaInitialOrderModel';
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
  initialEntryPrice?: string;
}

export class DcaInitialOrderService {
  private readonly getConfigurationModel: (
    configurationId: string,
  ) => DcaConfigurationModel | undefined;
  private readonly tradingRuleResolver: DcaTradingRuleResolver;
  private readonly cycleModels: DcaCycleModelSelector;
  private readonly persistence: DcaInitialOrderPersistenceModel;

  constructor(
    cyclePersistence: DcaCyclePersistenceModel,
    persistence: DcaInitialOrderPersistenceModel,
    getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.getConfigurationModel = getConfigurationModel;
    this.persistence = persistence;
    this.tradingRuleResolver = new DcaTradingRuleResolver();
    this.cycleModels = new DcaCycleModelSelector(cyclePersistence);
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
      type:
        executionMode === 'makerOnly'
          ? 'makerOnly'
          : executionMode === 'hybrid'
            ? 'limit'
            : 'market',
      executionMode,
      quantity: rules.minimumQuantity,
      ...(executionMode === 'makerOnly' || executionMode === 'hybrid'
        ? { price: await exchange.getBestBidPrice(configuration.symbol) }
        : {}),
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

    return preparation.exchange.placeOrder(
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
      const order = await preparation.exchange.placeOrder(
        preparation.request,
        preparation.balanceMode,
      );

      const initialOrder = this.persistence.saveOrder(
        configurationId,
        cycle.id,
        order,
        preparation.request,
      );

      const trades = await this.reconcileOrder(
        preparation.exchange,
        preparation.balanceMode,
        initialOrder.id,
        order,
      );

      const latestOrder = this.persistence.getByCycle(cycle.id);

      if (!latestOrder) {
        throw new Error(
          `Initial DCA order persistence record disappeared: ${cycle.id}`,
        );
      }

      if (latestOrder.status !== 'filled') {
        return {
          cycleId: cycle.id,
          order,
          trades,
        };
      }

      const allTrades = trades.length > 0
        ? trades
        : await this.getSavedTrades(latestOrder.id);

      if (allTrades.length === 0) {
        throw new Error(
          `Initial DCA order has no trade fills: ${order.orderId}`,
        );
      }

      const initialEntry = calculateTradeFillTotals(allTrades);
      cycle.recordInitialEntryPrice(initialEntry);

      return {
        cycleId: cycle.id,
        order: this.toExchangeOrder(latestOrder),
        trades: allTrades,
        initialEntryPrice: initialEntry.averagePrice,
      };
    } catch (error) {
      this.cycleModels.get(cycle.id)?.stop();
      throw error;
    }
  }

  async reconcilePending(
    configurationId: string,
  ): Promise<DcaInitialOrderExecution | undefined> {
    const cycle = this.cycleModels.getCurrent(configurationId);

    if (!cycle || cycle.status !== 'pending') {
      return undefined;
    }

    const initialOrder = this.persistence.getByCycle(cycle.id);

    if (!initialOrder) {
      throw new Error(
        `Pending DCA cycle has no initial order: ${cycle.id}`,
      );
    }

    const configuration = this.getConfigurationModel(configurationId);

    if (!configuration) {
      throw new Error(
        `DCA configuration not found: ${configurationId}`,
      );
    }

    const order = await configuration.exchange.getOrder(
      configuration.symbol,
      initialOrder.exchangeOrderId,
      configuration.balanceMode.id,
    );

    const trades = await this.reconcileOrder(
      configuration.exchange,
      configuration.balanceMode.id,
      initialOrder.id,
      order,
    );

    const latestOrder = this.persistence.getByCycle(cycle.id);

    if (!latestOrder) {
      throw new Error(
        `Initial DCA order persistence record disappeared: ${cycle.id}`,
      );
    }

    if (latestOrder.status !== 'filled') {
      return {
        cycleId: cycle.id,
        order,
        trades,
      };
    }

    const allTrades = trades.length > 0
      ? trades
      : await this.getSavedTrades(latestOrder.id);

    if (allTrades.length === 0) {
      throw new Error(
        `Initial DCA order has no trade fills: ${latestOrder.exchangeOrderId}`,
      );
    }

    const initialEntry = calculateTradeFillTotals(allTrades);
    cycle.recordInitialEntryPrice(initialEntry);

    return {
      cycleId: cycle.id,
      order,
      trades: allTrades,
      initialEntryPrice: initialEntry.averagePrice,
    };
  }

  private async reconcileOrder(
    exchange: ExchangeModel,
    balanceMode: BalanceModeModel['id'],
    initialOrderId: string,
    order: ExchangeOrder,
  ): Promise<ExchangeTrade[]> {
    this.persistence.updateOrder(initialOrderId, order);

    if (this.isZeroOrNegative(order.executedQuantity)) {
      return [];
    }

    const trades = await exchange.getOrderTrades(
      order.symbol,
      order.orderId,
      balanceMode,
    );

    if (trades.length > 0) {
      this.persistence.saveFills(initialOrderId, trades);
    }

    return trades;
  }

  private async getSavedTrades(
    initialOrderId: string,
  ): Promise<ExchangeTrade[]> {
    return this.persistence.getFills(initialOrderId).map((fill) => ({
      tradeId: fill.exchangeTradeId,
      orderId: fill.exchangeOrderId,
      symbol: fill.symbol,
      side: fill.side,
      price: fill.price,
      quantity: fill.quantity,
      quoteQuantity: fill.quoteQuantity,
      timestamp: fill.tradeTimestamp,
    }));
  }

  private toExchangeOrder(
    order: NonNullable<
      ReturnType<DcaInitialOrderService['persistence']['getByCycle']>
    >,
  ): ExchangeOrder {
    return {
      orderId: order.exchangeOrderId,
      ...(order.clientOrderId
        ? { clientOrderId: order.clientOrderId }
        : {}),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      quantity: order.quantity,
      executedQuantity: order.executedQuantity,
      ...(order.requestedPrice
        ? { price: order.requestedPrice }
        : {}),
    };
  }

  private isZeroOrNegative(value: string): boolean {
    return value.trim() === '' || /^0+(?:\.0+)?$/.test(value.trim());
  }
}
