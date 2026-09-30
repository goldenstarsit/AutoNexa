import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeTrade } from '../../exchange/trade/exchangeTrade';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../exchange/order/exchangeOrder';
import { ExchangeService } from '../../exchange/exchangeService';
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
  private readonly exchangeService: ExchangeService;
  private readonly cycleService: DcaCycleService;

  constructor(private readonly db: DatabaseAdapter) {
    this.configurationService = new DcaConfigurationService(db);
    this.tradingRuleResolver = new DcaTradingRuleResolver(db);
    this.exchangeService = new ExchangeService(db);
    this.cycleService = new DcaCycleService(db);
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

    const currentPrice = await this.exchangeService.getCurrentPrice(
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

    return this.exchangeService.placeOrder(
      preparation.exchangeId,
      preparation.request,
      preparation.balanceMode,
    );
  }

  async startCycleAndExecute(
    configurationId: string,
  ): Promise<DcaInitialOrderExecution> {
    const cycle = this.cycleService.startCycle(configurationId);

    try {
      const order = await this.execute(configurationId);

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

      const trades = await this.exchangeService.getOrderTrades(
        cycle.dcaConfigurationId,
        order.symbol,
        order.orderId,
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
