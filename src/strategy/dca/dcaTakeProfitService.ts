import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { ExchangeOrder } from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import { DcaCycleService } from './dcaCycleService';
import type { DcaExitOrderModelSelector } from '../../domain/strategy/dca/dcaExitOrderModel';
import { DcaExitOrderModelSelectorImpl } from './models/dcaExitOrderModelSelector';
import { DcaExitOrderRepository } from './dcaExitOrderRepository';
import {
  calculateDcaTakeProfitPrice,
} from './dcaTakeProfitCalculator';
import {
  evaluateDcaTakeProfit,
  type DcaTakeProfitEvaluation,
} from './dcaTakeProfitEvaluator';

export interface DcaTakeProfitServiceResult extends DcaTakeProfitEvaluation {
  configurationId: string;
  cycleId: string;
  cycleNumber: number;
  exchangeId: string;
  symbol: string;
}

export interface DcaTakeProfitExecution extends DcaTakeProfitServiceResult {
  order: ExchangeOrder;
  trades: ExchangeTrade[];
  soldQuantity: string;
}

export class DcaTakeProfitService {
  private readonly getConfigurationModel: (
    configurationId: string,
  ) => DcaConfigurationModel | undefined;
  private readonly cycleService: DcaCycleService;
  private readonly exitOrderRepository: DcaExitOrderModelSelector;
  private readonly exitOrderPersistence: DcaExitOrderRepository;

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
    this.exitOrderPersistence = new DcaExitOrderRepository(db);
    this.exitOrderRepository = new DcaExitOrderModelSelectorImpl(this.exitOrderPersistence);
  }

  async evaluate(
    configurationId: string,
  ): Promise<DcaTakeProfitServiceResult> {
    const context = await this.prepareEvaluation(configurationId);

    return {
      configurationId: context.configuration.id,
      cycleId: context.cycle.id,
      cycleNumber: context.cycle.cycleNumber,
      exchangeId: context.configuration.exchangeId,
      symbol: context.configuration.symbol,
      ...context.evaluation,
    };
  }

  async execute(
    configurationId: string,
  ): Promise<DcaTakeProfitExecution> {
    const context = await this.prepareEvaluation(configurationId);

    if (!context.evaluation.reached) {
      throw new Error(
        `DCA take profit has not been reached: ${configurationId}`,
      );
    }

    const existing = this.exitOrderRepository.getByCycleAndType(
      context.cycle.id,
      'takeProfit',
    );

    if (existing) {
      const trades = this.exitOrderRepository.getFills(existing.id);

      if (
        existing.status === 'filled' &&
        trades.length > 0 &&
        existing.executedQuantity !== '0'
      ) {
        this.cycleService.completeCycle(context.cycle.id);

        return {
          ...context.evaluation,
          configurationId: context.configuration.id,
          cycleId: context.cycle.id,
          cycleNumber: context.cycle.cycleNumber,
          exchangeId: context.configuration.exchangeId,
          symbol: context.configuration.symbol,
          order: this.toExchangeOrder(existing),
          trades: trades.map((trade) => this.toExchangeTrade(trade)),
          soldQuantity: existing.executedQuantity,
        };
      }

      throw new Error(
        `DCA take-profit exit order already exists: ${existing.exchangeOrderId}`,
      );
    }

    if (
      !context.cycle.entryQuantity ||
      context.cycle.entryQuantity === '0'
    ) {
      throw new Error(
        `DCA cycle has no entry quantity for take profit: ${context.cycle.id}`,
      );
    }

    const executionMode = context.configuration.executionMode.id;


    const request: import('../../domain/exchange/exchangeOrder').ExchangeOrderRequest =
      {
        symbol: context.configuration.symbol,
        side: 'sell',
        type: 'market',
        executionMode,
        quantity: context.cycle.entryQuantity,
      };

    const exchange = context.configuration.exchange;

    const order = await exchange.placeOrder(
      request,
      context.configuration.balanceMode.id,
    );

    const runtimeOrder = this.exitOrderPersistence.saveOrder(
      context.configuration.id,
      context.cycle.id,
      'takeProfit',
      order,
      request,
    );

    if (order.status !== 'filled') {
      throw new Error(
        `Take-profit order was not fully filled: ${order.orderId} (${order.status})`,
      );
    }

    if (order.executedQuantity === '0') {
      throw new Error(
        `Take-profit order has no executed quantity: ${order.orderId}`,
      );
    }

    const trades = await exchange.getOrderTrades(
      context.configuration.symbol,
      order.orderId,
      context.configuration.balanceMode.id,
    );

    if (trades.length === 0) {
      throw new Error(
        `Take-profit order has no trade fills: ${order.orderId}`,
      );
    }

    this.exitOrderPersistence.saveFills(runtimeOrder.id, trades);
    this.cycleService.completeCycle(context.cycle.id);

    return {
      ...context.evaluation,
      configurationId: context.configuration.id,
      cycleId: context.cycle.id,
      cycleNumber: context.cycle.cycleNumber,
      exchangeId: context.configuration.exchangeId,
      symbol: context.configuration.symbol,
      order,
      trades,
      soldQuantity: order.executedQuantity,
    };
  }

  private async prepareEvaluation(configurationId: string) {
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

    const cycle = this.cycleService.getCurrent(configurationId);

    if (!cycle) {
      throw new Error(
        `DCA cycle not found: ${configurationId}`,
      );
    }

    if (cycle.status !== 'active') {
      throw new Error(
        `DCA cycle is not active: ${cycle.id} (${cycle.status})`,
      );
    }

    if (!cycle.averageEntryPrice) {
      throw new Error(
        `DCA cycle has no average entry price: ${cycle.id}`,
      );
    }

    const exchange = configuration.exchange;
    const currentPrice = await exchange.getCurrentPrice(
      configuration.symbol,
    );

    const takeProfitPrice = calculateDcaTakeProfitPrice(
      cycle.averageEntryPrice,
      configuration.takeProfitPercent,
    );

    const evaluation = evaluateDcaTakeProfit(
      cycle.averageEntryPrice,
      configuration.takeProfitPercent,
      currentPrice,
      takeProfitPrice,
    );

    return {
      configuration,
      cycle,
      evaluation,
    };
  }

  private toExchangeOrder(order: {
    exchangeOrderId: string;
    clientOrderId?: string;
    symbol: string;
    side: ExchangeOrder['side'];
    type: ExchangeOrder['type'];
    status: ExchangeOrder['status'];
    quantity: string;
    executedQuantity: string;
    requestedPrice?: string;
  }): ExchangeOrder {
    return {
      orderId: order.exchangeOrderId,
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      quantity: order.quantity,
      executedQuantity: order.executedQuantity,
      price: order.requestedPrice,
    };
  }

  private toExchangeTrade(trade: {
    exchangeTradeId: string;
    exchangeOrderId: string;
    symbol: string;
    side: ExchangeTrade['side'];
    price: string;
    quantity: string;
    quoteQuantity: string;
    tradeTimestamp: number;
  }): ExchangeTrade {
    return {
      tradeId: trade.exchangeTradeId,
      orderId: trade.exchangeOrderId,
      symbol: trade.symbol,
      side: trade.side,
      price: trade.price,
      quantity: trade.quantity,
      quoteQuantity: trade.quoteQuantity,
      timestamp: trade.tradeTimestamp,
    };
  }
}
