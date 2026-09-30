import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeOrder } from '../../exchange/order/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/trade/exchangeTrade';
import { ExchangeService } from '../../exchange/exchangeService';
import { DcaConfigurationService } from './dcaConfigurationService';
import { DcaCycleService } from './dcaCycleService';
import { DcaExitOrderRepository } from './dcaExitOrderRepository';
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
  private readonly configurationService: DcaConfigurationService;
  private readonly cycleService: DcaCycleService;
  private readonly exchangeService: ExchangeService;
  private readonly exitOrderRepository: DcaExitOrderRepository;

  constructor(private readonly db: DatabaseAdapter) {
    this.configurationService = new DcaConfigurationService(db);
    this.cycleService = new DcaCycleService(db);
    this.exchangeService = new ExchangeService(db);
    this.exitOrderRepository = new DcaExitOrderRepository(db);
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

    if (!context.evaluation.reached) {
      throw new Error(
        `DCA stop loss has not been reached: ${configurationId}`,
      );
    }

    const existing = this.exitOrderRepository.getByCycleAndType(
      context.cycle.id,
      'stopLoss',
    );

    if (existing) {
      const trades = this.exitOrderRepository.getFills(existing.id);

      if (
        existing.status === 'filled' &&
        trades.length > 0 &&
        existing.executedQuantity !== '0'
      ) {
        this.cycleService.stopCycle(context.cycle.id);

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
        `DCA stop-loss exit order already exists: ${existing.exchangeOrderId}`,
      );
    }

    if (!context.cycle.entryQuantity || context.cycle.entryQuantity === '0') {
      throw new Error(
        `DCA cycle has no entry quantity for stop loss: ${context.cycle.id}`,
      );
    }

    const executionMode = context.configuration.executionModeId;

    if (
      executionMode !== 'makerOnly' &&
      executionMode !== 'takerOnly' &&
      executionMode !== 'hybrid'
    ) {
      throw new Error(
        `Unsupported DCA execution mode: ${executionMode}`,
      );
    }

    const request: import('../../exchange/order/exchangeOrder').ExchangeOrderRequest = {
      symbol: context.configuration.symbol,
      side: 'sell',
      type: 'market',
      executionMode,
      quantity: context.cycle.entryQuantity,
    };

    const order = await this.exchangeService.placeOrder(
      context.configuration.exchangeId,
      request,
      context.configuration.balanceModeId as 'live' | 'test',
    );

    const runtimeOrder = this.exitOrderRepository.saveOrder(
      context.configuration.id,
      context.cycle.id,
      'stopLoss',
      order,
      request,
    );

    if (order.status !== 'filled') {
      throw new Error(
        `Stop-loss order was not fully filled: ${order.orderId} (${order.status})`,
      );
    }

    if (order.executedQuantity === '0') {
      throw new Error(
        `Stop-loss order has no executed quantity: ${order.orderId}`,
      );
    }

    const trades = await this.exchangeService.getOrderTrades(
      context.configuration.exchangeId,
      context.configuration.symbol,
      order.orderId,
      context.configuration.balanceModeId as 'live' | 'test',
    );

    if (trades.length === 0) {
      throw new Error(
        `Stop-loss order has no trade fills: ${order.orderId}`,
      );
    }

    this.exitOrderRepository.saveFills(runtimeOrder.id, trades);
    this.cycleService.stopCycle(context.cycle.id);

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
    const configuration = this.configurationService.getById(configurationId);

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

    if (!cycle.initialEntryPrice) {
      throw new Error(
        `DCA cycle has no initial entry price: ${cycle.id}`,
      );
    }

    const currentPrice = await this.exchangeService.getCurrentPrice(
      configuration.exchangeId,
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
