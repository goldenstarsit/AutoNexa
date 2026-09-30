import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { BalanceModeModelSelector } from '../../domain/balance/balanceModeModel';
import type { ExchangeModelSelector } from '../../domain/exchange/exchangeModel';
import type { ExecutionModeModelSelector } from '../../domain/execution/executionModeModel';
import type { StrategyTypeModelSelector } from '../../domain/strategy/strategyTypeModel';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../exchange/order/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/trade/exchangeTrade';
import {
  calculateTradeFillTotals,
  combineTradeFillTotals,
} from '../../exchange/trade/exchangeTradeFillCalculator';
import { DcaConfigurationService } from './dcaConfigurationService';
import { DcaCycleService } from './dcaCycleService';
import { DcaTradingRuleResolver } from './dcaTradingRuleResolver';
import {
  DcaOrderRepository,
  type DcaRuntimeOrderRecord,
} from './dcaOrderRepository';

export interface DcaOrderPreparation {
  configurationId: string;
  cycleId: string;
  symbol: string;
  exchangeId: string;
  balanceMode: 'live' | 'test';
  level: number;
  dcaOrderId: string;
  dropPercent: string;
  executionMode: ExchangeOrderRequest['executionMode'];
  quantity: string;
  currentPrice: string;
  request: ExchangeOrderRequest;
}

export class DcaOrderService {
  private readonly configurationService: DcaConfigurationService;
  private readonly cycleService: DcaCycleService;
  private readonly tradingRuleResolver: DcaTradingRuleResolver;
  private readonly exchanges: ExchangeModelSelector;
  private readonly executionModes: ExecutionModeModelSelector;
  private readonly orderRepository: DcaOrderRepository;

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
    this.cycleService = new DcaCycleService(
      db,
      strategyTypes,
      balanceModes,
      exchanges,
      executionModes,
    );
    this.tradingRuleResolver = new DcaTradingRuleResolver(exchanges);
    this.exchanges = exchanges;
    this.executionModes = executionModes;
    this.orderRepository = new DcaOrderRepository(db);
  }

  async prepare(
    configurationId: string,
    cycleId: string,
    level: number,
  ): Promise<DcaOrderPreparation> {
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

    if (!Number.isInteger(level) || level < 1) {
      throw new Error(`Invalid DCA level: ${level}`);
    }

    const cycle = this.cycleService.getCurrent(configurationId);

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

    const executionMode = this.executionModes.get(configuration.executionModeId).id;

    this.executionModes.get(executionMode);

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
      cycleId: cycle.id,
      symbol: configuration.symbol,
      exchangeId: configuration.exchangeId,
      balanceMode: configuration.balanceModeId as 'live' | 'test',
      level: order.level,
      dcaOrderId: order.dcaOrderId,
      dropPercent: order.dropPercent,
      executionMode,
      quantity: rules.minimumQuantity,
      currentPrice,
      request,
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
      this.orderRepository.getByCycleAndLevel(
        preparation.cycleId,
        preparation.level,
      )
    ) {
      throw new Error(
        `DCA order already executed: ${preparation.cycleId}:level-${preparation.level}`,
      );
    }

    const exchange = this.exchanges.get(preparation.exchangeId);

    const order = await exchange.adapter.placeOrder(
      preparation.request,
      preparation.balanceMode,
    );

    const runtimeOrder = this.orderRepository.saveOrder(
      preparation.configurationId,
      preparation.cycleId,
      preparation.dcaOrderId,
      preparation.level,
      order,
      preparation.request,
    );

    const trades =
      order.executedQuantity !== '0'
        ? await exchange.adapter.getOrderTrades(
            preparation.symbol,
            order.orderId,
            preparation.balanceMode,
          )
        : [];

    this.orderRepository.saveFills(runtimeOrder.id, trades);

    if (trades.length > 0) {
      const cycle = this.cycleService.getCurrent(
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
        this.orderRepository.getFillsByCycle(
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

      this.cycleService.recordDcaEntryTotals(
        preparation.cycleId,
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
