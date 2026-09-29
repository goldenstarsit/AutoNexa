import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../exchange/order/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/trade/exchangeTrade';
import { ExchangeService } from '../../exchange/exchangeService';
import { DcaConfigurationService } from './dcaConfigurationService';
import { DcaCycleService } from './dcaCycleService';
import { DcaTradingRuleResolver } from './dcaTradingRuleResolver';

export interface DcaInitialOrderPreparation {
  configurationId: string;
  symbol: string;
  exchangeId: string;
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

      const initialEntryPrice =
        calculateWeightedAveragePrice(trades);

      const activeCycle = this.cycleService.recordInitialEntryPrice(
        cycle.id,
        initialEntryPrice,
      );

      return {
        cycleId: activeCycle.id,
        order,
        trades,
        initialEntryPrice,
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

function calculateWeightedAveragePrice(
  trades: ExchangeTrade[],
): string {
  let totalQuantity = '0';
  let totalQuoteQuantity = '0';

  for (const trade of trades) {
    if (
      trade.side !== 'buy' ||
      !isPositiveDecimal(trade.quantity) ||
      !isPositiveDecimal(trade.quoteQuantity)
    ) {
      throw new Error(
        `Invalid initial DCA trade fill: ${trade.tradeId}`,
      );
    }

    totalQuantity = addDecimal(totalQuantity, trade.quantity);
    totalQuoteQuantity = addDecimal(
      totalQuoteQuantity,
      trade.quoteQuantity,
    );
  }

  if (isZeroDecimal(totalQuantity)) {
    throw new Error('Initial DCA fills have zero total quantity');
  }

  return divideDecimal(totalQuoteQuantity, totalQuantity);
}

function isPositiveDecimal(value: string): boolean {
  return (
    /^[0-9]+(?:\.[0-9]+)?$/.test(value.trim()) &&
    !isZeroDecimal(value)
  );
}

function isZeroDecimal(value: string): boolean {
  return /^0+(?:\.0+)?$/.test(value.trim());
}

function addDecimal(a: string, b: string): string {
  const [aInteger, aFraction = ''] = normalizeDecimal(a);
  const [bInteger, bFraction = ''] = normalizeDecimal(b);
  const scale = Math.max(aFraction.length, bFraction.length);
  const aScaled = BigInt(`${aInteger}${aFraction.padEnd(scale, '0')}`);
  const bScaled = BigInt(`${bInteger}${bFraction.padEnd(scale, '0')}`);
  const sum = aScaled + bScaled;
  const text = sum.toString().padStart(scale + 1, '0');

  if (scale === 0) {
    return text;
  }

  const integerPart = text.slice(0, -scale) || '0';
  const fractionPart = text.slice(-scale).replace(/0+$/, '');

  return fractionPart
    ? `${integerPart}.${fractionPart}`
    : integerPart;
}

function divideDecimal(dividend: string, divisor: string): string {
  const [dividendInteger, dividendFraction = ''] =
    normalizeDecimal(dividend);
  const [divisorInteger, divisorFraction = ''] =
    normalizeDecimal(divisor);

  const dividendScale = dividendFraction.length;
  const divisorScale = divisorFraction.length;

  const dividendDigits = BigInt(
    `${dividendInteger}${dividendFraction}`,
  );
  const divisorDigits = BigInt(
    `${divisorInteger}${divisorFraction}`,
  );

  if (divisorDigits === BigInt(0)) {
    throw new Error('Cannot divide by zero');
  }

  const scale = 18;
  const numerator =
    dividendDigits * BigInt(10) ** BigInt(scale + divisorScale);
  const denominator =
    divisorDigits * BigInt(10) ** BigInt(dividendScale);
  const quotient = numerator / denominator;
  const text = quotient.toString().padStart(scale + 1, '0');
  const integerPart = text.slice(0, -scale) || '0';
  const fractionPart = text.slice(-scale).replace(/0+$/, '');

  return fractionPart
    ? `${integerPart}.${fractionPart}`
    : integerPart;
}

function normalizeDecimal(value: string): [string, string] {
  const normalized = value.trim();

  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const [integerPart, fractionPart = ''] = normalized.split('.');
  return [integerPart.replace(/^0+(?=\d)/, '') || '0', fractionPart];
}
