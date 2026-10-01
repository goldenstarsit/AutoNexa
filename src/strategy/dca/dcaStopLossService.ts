import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { ExchangeOrder } from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type { DcaCyclePersistenceModel } from '../../domain/strategy/dca/dcaCycleModel';
import { DcaCycleModelSelector } from './models/dcaCycleModelSelector';
import type { DcaExitOrderModelSelector } from '../../domain/strategy/dca/dcaExitOrderModel';
import { DcaExitOrderModelSelectorImpl } from './models/dcaExitOrderModelSelector';
import type { DcaExitOrderPersistenceModel } from '../../domain/strategy/dca/dcaExitOrderModel';
import {
  evaluateDcaStopLoss,
  type DcaStopLossEvaluation,
} from './dcaStopLossEvaluator';

export interface DcaStopLossServiceResult extends DcaStopLossEvaluation {
  configurationId: string;
  cycleId: string;
  cycleNumber: number;
  exchangeId: string;
  symbol: string;
}

export interface DcaStopLossExecution extends DcaStopLossServiceResult {
  order: ExchangeOrder;
  trades: ExchangeTrade[];
  soldQuantity: string;
}

export class DcaStopLossService {
  private readonly getConfigurationModel: (
    configurationId: string,
  ) => DcaConfigurationModel | undefined;
  private readonly cycleModels: DcaCycleModelSelector;
  private readonly exitOrderRepository: DcaExitOrderModelSelector;
  private readonly exitOrderPersistence: DcaExitOrderPersistenceModel;

  constructor(
    cyclePersistence: DcaCyclePersistenceModel,
    exitOrderPersistence: DcaExitOrderPersistenceModel,
    getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.getConfigurationModel = getConfigurationModel;
    this.cycleModels = new DcaCycleModelSelector(cyclePersistence);
    this.exitOrderPersistence = exitOrderPersistence;
    this.exitOrderRepository = new DcaExitOrderModelSelectorImpl(
      exitOrderPersistence,
    );
  }

  async evaluate(
    configurationId: string,
  ): Promise<DcaStopLossServiceResult> {
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
  ): Promise<DcaStopLossExecution> {
    const context = await this.prepareEvaluation(configurationId);

    const exchange = context.configuration.exchange;
    const existing = this.exitOrderRepository.getByCycleAndType(
      context.cycle.id,
      'stopLoss',
    );

    if (
      existing &&
      (existing.status === 'open' || existing.status === 'partiallyFilled')
    ) {
      const order = await exchange.getOrder(
        context.configuration.symbol,
        existing.exchangeOrderId,
        context.configuration.balanceMode.id,
      );

      this.exitOrderPersistence.updateOrder(existing.id, order);

      const trades =
        order.executedQuantity !== '0'
          ? await exchange.getOrderTrades(
              context.configuration.symbol,
              order.orderId,
              context.configuration.balanceMode.id,
            )
          : [];

      this.exitOrderPersistence.saveFills(existing.id, trades);

      if (order.status !== 'filled') {
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

      if (order.executedQuantity === '0' || trades.length === 0) {
        throw new Error(
          `Stop-loss order is marked filled without trade fills: ${order.orderId}`,
        );
      }

      this.cycleModels.get(context.cycle.id)?.stop();

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

    if (!context.evaluation.reached) {
      throw new Error(
        `DCA stop loss has not been reached: ${configurationId}`,
      );
    }

    if (!context.cycle.entryQuantity || context.cycle.entryQuantity === '0') {
      throw new Error(
        `DCA cycle has no entry quantity for stop loss: ${context.cycle.id}`,
      );
    }

    const executionMode = context.configuration.executionMode.id;

    const request: import('../../domain/exchange/exchangeOrder').ExchangeOrderRequest = {
      symbol: context.configuration.symbol,
      side: 'sell',
      type:
        executionMode === 'makerOnly'
          ? 'makerOnly'
          : executionMode === 'hybrid'
            ? 'limit'
            : 'market',
      executionMode,
      quantity: context.cycle.entryQuantity,
      ...(executionMode === 'makerOnly' || executionMode === 'hybrid'
        ? {
            price: await exchange.getBestAskPrice(
              context.configuration.symbol,
            ),
          }
        : {}),
    };

    const order = await exchange.placeOrder(
      request,
      context.configuration.balanceMode.id,
    );

    const runtimeOrder = this.exitOrderPersistence.saveOrder(
      context.configuration.id,
      context.cycle.id,
      'stopLoss',
      order,
      request,
    );

    if (order.status !== 'filled') {
      return {
        ...context.evaluation,
        configurationId: context.configuration.id,
        cycleId: context.cycle.id,
        cycleNumber: context.cycle.cycleNumber,
        exchangeId: context.configuration.exchangeId,
        symbol: context.configuration.symbol,
        order,
        trades: [],
        soldQuantity: order.executedQuantity,
      };
    }

    if (order.executedQuantity === '0') {
      throw new Error(
        `Stop-loss order has no executed quantity: ${order.orderId}`,
      );
    }

    const trades = await exchange.getOrderTrades(
      context.configuration.symbol,
      order.orderId,
      context.configuration.balanceMode.id,
    );

    if (trades.length === 0) {
      throw new Error(
        `Stop-loss order has no trade fills: ${order.orderId}`,
      );
    }

    this.exitOrderPersistence.saveFills(runtimeOrder.id, trades);
    this.cycleModels.get(context.cycle.id)?.stop();

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
    const configuration = this.getConfigurationModel(configurationId);

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

    const cycle = this.cycleModels.getCurrent(configurationId);

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

    if (!cycle.initialEntryPrice) {
      throw new Error(
        `DCA cycle has no initial entry price: ${cycle.id}`,
      );
    }

    const exchange = configuration.exchange;
    const currentPrice = await exchange.getCurrentPrice(
      configuration.symbol,
    );

    const evaluation = evaluateDcaStopLoss(
      cycle.initialEntryPrice,
      configuration.stopLossPercent,
      currentPrice,
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
