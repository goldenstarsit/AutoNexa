import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { BalanceModeModel } from '../../domain/balance/balanceModeModel';
import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import {
  calculateTradeFillTotals,
  combineTradeFillTotals,
} from '../../exchange/trade/exchangeTradeFillCalculator';
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
  private readonly cycleService: DcaCycleService;
  private readonly tradingRuleResolver: DcaTradingRuleResolver;
  private readonly orderRepository: DcaOrderRepository;

  constructor(
    private readonly db: DatabaseModel,
    getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.getConfigurationModel = getConfigurationModel;

    this.cycleService = new DcaCycleService(
      db,
      this.getConfigurationModel,
    );
    this.tradingRuleResolver = new DcaTradingRuleResolver();
    this.orderRepository = new DcaOrderRepository(db);
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

    const exchange = preparation.exchange;

    const order = await exchange.placeOrder(
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
        ? await exchange.getOrderTrades(
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
