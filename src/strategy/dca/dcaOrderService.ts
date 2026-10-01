import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { DcaRuntimeOrderPersistenceModel } from '../../domain/strategy/dca/dcaRuntimeOrderModel';
import type { BalanceModeModel } from '../../domain/balance/balanceModeModel';
import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import {
  calculateTradeFillTotals,
  combineTradeFillTotals,
} from '../../exchange/trade/exchangeTradeFillCalculator';
import type { DcaCyclePersistenceModel } from '../../domain/strategy/dca/dcaCycleModel';
import { DcaCycleModelSelector } from './models/dcaCycleModelSelector';
import { DcaTradingRuleResolver } from './dcaTradingRuleResolver';
import type { DcaRuntimeOrderRecord } from '../../domain/strategy/dca/dcaRuntimeOrderModel';

export interface DcaOrderPreparation {
  configurationId: string;
  cycleId: string;
  symbol: string;
  exchange: ExchangeModel;
  balanceMode: BalanceModeModel['id'];
  level: number;
  dcaOrderId: string;
  dropPercent: string;
  executionMode: ExchangeOrderRequest['executionMode'];
  quantity: string;
  currentPrice: string;
  request: ExchangeOrderRequest;
}

export class DcaOrderService {
  private readonly getConfigurationModel: (
    configurationId: string,
  ) => DcaConfigurationModel | undefined;
  private readonly cycleModels: DcaCycleModelSelector;
  private readonly tradingRuleResolver: DcaTradingRuleResolver;
  private readonly runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel;

  constructor(
    cyclePersistence: DcaCyclePersistenceModel,
    runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel,
    getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.getConfigurationModel = getConfigurationModel;
    this.cycleModels = new DcaCycleModelSelector(
      cyclePersistence,
    );
    this.tradingRuleResolver = new DcaTradingRuleResolver();
    this.runtimeOrderPersistence = runtimeOrderPersistence;
  }

  async prepare(
    configurationId: string,
    cycleId: string,
    level: number,
  ): Promise<DcaOrderPreparation> {
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

    if (!Number.isInteger(level) || level < 1) {
      throw new Error(`Invalid DCA level: ${level}`);
    }

    const cycle = this.cycleModels.getCurrent(configurationId);

    if (!cycle || cycle.id !== cycleId) {
      throw new Error(
        `DCA cycle is not current: ${cycleId}`,
      );
    }

    if (cycle.status !== 'active') {
      throw new Error(
        `DCA cycle is not active: ${cycleId} (${cycle.status})`,
      );
    }

    if (!cycle.initialEntryPrice) {
      throw new Error(
        `DCA cycle has no initial entry price: ${cycleId}`,
      );
    }

    const order = configuration.orders.find(
      (item) => item.level === level,
    );

    if (!order) {
      throw new Error(
        `DCA level not configured: ${configurationId}:level-${level}`,
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
      cycleId: cycle.id,
      symbol: configuration.symbol,
      exchange,
      balanceMode: configuration.balanceMode.id,
      level: order.level,
      dcaOrderId: order.dcaOrderId,
      dropPercent: order.dropPercent,
      executionMode,
      quantity: rules.minimumQuantity,
      currentPrice,
      request,
    };
  }

  async reconcilePending(
    configurationId: string,
    cycleId: string,
    level: number,
  ): Promise<{ order: ExchangeOrder; trades: ExchangeTrade[]; filled: boolean }> {
    const configuration = this.getConfigurationModel(configurationId);
    if (!configuration) {
      throw new Error(`DCA configuration not found: ${configurationId}`);
    }

    const runtimeOrder = this.runtimeOrderPersistence.getByCycleAndLevel(
      cycleId,
      level,
    );

    if (!runtimeOrder) {
      throw new Error(
        `DCA runtime order not found: ${cycleId}:level-${level}`,
      );
    }

    const order = await configuration.exchange.getOrder(
      configuration.symbol,
      runtimeOrder.exchangeOrderId,
      configuration.balanceMode.id,
    );

    this.runtimeOrderPersistence.updateOrder(runtimeOrder.id, order);

    const trades =
      order.executedQuantity !== '0'
        ? await configuration.exchange.getOrderTrades(
            configuration.symbol,
            order.orderId,
            configuration.balanceMode.id,
          )
        : [];

    this.runtimeOrderPersistence.saveFills(runtimeOrder.id, trades);

    if (trades.length > 0) {
      const cycle = this.cycleModels.getCurrent(configurationId);
      if (!cycle || cycle.id !== cycleId) {
        throw new Error(`DCA cycle is not current: ${cycleId}`);
      }

      if (!cycle.entryQuantity || !cycle.entryQuoteQuantity) {
        throw new Error(`DCA cycle has no initial entry totals: ${cycleId}`);
      }

      const cycleFills = this.runtimeOrderPersistence.getFillsByCycle(cycleId);
      const dcaTrades: ExchangeTrade[] = cycleFills.map((fill) => ({
        tradeId: fill.exchangeTradeId,
        orderId: fill.exchangeOrderId,
        symbol: fill.symbol,
        side: fill.side,
        price: fill.price,
        quantity: fill.quantity,
        quoteQuantity: fill.quoteQuantity,
        timestamp: fill.tradeTimestamp,
      }));

      const dcaTotals = calculateTradeFillTotals(dcaTrades);
      const combinedTotals = combineTradeFillTotals(
        {
          quantity: cycle.entryQuantity,
          quoteQuantity: cycle.entryQuoteQuantity,
        },
        dcaTotals,
      );

      cycle.recordDcaEntryTotals(
        combinedTotals.quantity,
        combinedTotals.quoteQuantity,
        combinedTotals.averagePrice,
      );
    }

    return {
      order,
      trades,
      filled: order.status === 'filled',
    };
  }

  async execute(
    preparation: DcaOrderPreparation,
  ): Promise<{
    order: ExchangeOrder;
    runtimeOrder: DcaRuntimeOrderRecord;
    trades: ExchangeTrade[];
  }> {
    if (
      this.runtimeOrderPersistence.getByCycleAndLevel(
        preparation.cycleId,
        preparation.level,
      )
    ) {
      throw new Error(
        `DCA order already executed: ${preparation.cycleId}:level-${preparation.level}`,
      );
    }

    const exchange = preparation.exchange;

    const order = await exchange.placeOrder(
      preparation.request,
      preparation.balanceMode,
    );

    const runtimeOrder = this.runtimeOrderPersistence.saveOrder(
      preparation.configurationId,
      preparation.cycleId,
      preparation.dcaOrderId,
      preparation.level,
      order,
      preparation.request,
    );

    const trades =
      order.executedQuantity !== '0'
        ? await exchange.getOrderTrades(
            preparation.symbol,
            order.orderId,
            preparation.balanceMode,
          )
        : [];

    this.runtimeOrderPersistence.saveFills(runtimeOrder.id, trades);

    if (trades.length > 0) {
      const cycle = this.cycleModels.getCurrent(
        preparation.configurationId,
      );

      if (!cycle || cycle.id !== preparation.cycleId) {
        throw new Error(
          `DCA cycle is not current: ${preparation.cycleId}`,
        );
      }

      if (!cycle.entryQuantity || !cycle.entryQuoteQuantity) {
        throw new Error(
          `DCA cycle has no initial entry totals: ${preparation.cycleId}`,
        );
      }

      const cycleFills =
        this.runtimeOrderPersistence.getFillsByCycle(
          preparation.cycleId,
        );

      const dcaTrades: ExchangeTrade[] = cycleFills.map(
        (fill) => ({
          tradeId: fill.exchangeTradeId,
          orderId: fill.exchangeOrderId,
          symbol: fill.symbol,
          side: fill.side,
          price: fill.price,
          quantity: fill.quantity,
          quoteQuantity: fill.quoteQuantity,
          timestamp: fill.tradeTimestamp,
        }),
      );

      const dcaTotals =
        calculateTradeFillTotals(dcaTrades);

      const combinedTotals = combineTradeFillTotals(
        {
          quantity: cycle.entryQuantity,
          quoteQuantity: cycle.entryQuoteQuantity,
        },
        dcaTotals,
      );

      cycle.recordDcaEntryTotals(
        combinedTotals.quantity,
        combinedTotals.quoteQuantity,
        combinedTotals.averagePrice,
      );
    }

    return {
      order,
      runtimeOrder,
      trades,
    };
  }
}
