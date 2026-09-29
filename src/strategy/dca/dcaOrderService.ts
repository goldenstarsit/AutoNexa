import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../exchange/order/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/trade/exchangeTrade';
import { ExchangeService } from '../../exchange/exchangeService';
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
  private readonly exchangeService: ExchangeService;
  private readonly orderRepository: DcaOrderRepository;

  constructor(private readonly db: DatabaseAdapter) {
    this.configurationService = new DcaConfigurationService(db);
    this.cycleService = new DcaCycleService(db);
    this.tradingRuleResolver = new DcaTradingRuleResolver(db);
    this.exchangeService = new ExchangeService(db);
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

    const currentPrice =
      await this.exchangeService.getCurrentPrice(
        configuration.exchangeId,
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

    const order = await this.exchangeService.placeOrder(
      preparation.exchangeId,
      preparation.request,
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
        ? await this.exchangeService.getOrderTrades(
            preparation.exchangeId,
            preparation.symbol,
            order.orderId,
          )
        : [];

    this.orderRepository.saveFills(runtimeOrder.id, trades);

    return {
      order,
      runtimeOrder,
      trades,
    };
  }
}
