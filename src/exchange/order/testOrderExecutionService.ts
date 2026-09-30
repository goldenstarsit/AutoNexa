import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeSymbolInfo } from '../market/exchangeMarket';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
  ExchangeOrderStatus,
} from './exchangeOrder';
import { TestBalanceService } from '../account/testBalanceService';
import { addDecimalAmounts, compareDecimalAmounts, multiplyDecimalAmounts } from '../account/decimalAmount';
import { TestOrderRepository, type TestOrderRecord, type TestOrderTradeRecord } from './testOrderRepository';

export interface TestOrderExecutionMarket {
  getCurrentPrice(symbol: string): Promise<string>;
  getSymbolInfo(symbol: string): Promise<ExchangeSymbolInfo>;
}

export class TestOrderExecutionService {
  private readonly repository: TestOrderRepository;
  private readonly balanceService: TestBalanceService;

  constructor(
    private readonly db: DatabaseAdapter,
    private readonly exchangeId: string,
    private readonly market: TestOrderExecutionMarket,
  ) {
    this.repository = new TestOrderRepository(db);
    this.balanceService = new TestBalanceService(db, exchangeId);
  }

  async execute(request: ExchangeOrderRequest): Promise<ExchangeOrder> {
    if (request.type !== 'market') {
      throw new Error(`Test order execution currently supports market orders only: ${request.type}`);
    }

    const symbolInfo = await this.market.getSymbolInfo(request.symbol);
    const currentPrice = await this.market.getCurrentPrice(request.symbol);

    const baseAsset = symbolInfo.baseAsset;
    const quoteAsset = symbolInfo.quoteAsset;

    const quantity = request.quantity;
    const quoteQuantity = multiplyDecimalAmounts(quantity, currentPrice);

    if (compareDecimalAmounts(quoteQuantity, '0') <= 0) {
      throw new Error(`Test order quote quantity must be positive: ${request.symbol}`);
    }

    const now = new Date().toISOString();
    const timestamp = Date.now();
    const orderId = `test-${randomUUID()}`;
    const tradeId = `test-trade-${randomUUID()}`;

    const order: TestOrderRecord = {
      id: orderId,
      exchangeId: this.exchangeId,
      symbol: request.symbol.toUpperCase(),
      side: request.side,
      type: request.type,
      executionMode: request.executionMode,
      status: 'filled',
      quantity,
      executedQuantity: quantity,
      ...(request.price ? { requestedPrice: request.price } : {}),
      averageFillPrice: currentPrice,
      ...(request.clientOrderId ? { clientOrderId: request.clientOrderId } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const trade: TestOrderTradeRecord = {
      id: `test-trade-record-${randomUUID()}`,
      testOrderId: orderId,
      exchangeTradeId: tradeId,
      exchangeOrderId: orderId,
      symbol: request.symbol.toUpperCase(),
      side: request.side,
      price: currentPrice,
      quantity,
      quoteQuantity,
      tradeTimestamp: timestamp,
      createdAt: now,
    };

    this.db.transaction(() => {
      const account = this.db.get<{ free: string }>(
        `
          SELECT free
          FROM test_balances
          WHERE exchange_id = ?
            AND asset = ?
        `,
        this.exchangeId,
        request.side === 'buy' ? quoteAsset : baseAsset,
      );

      const available = account?.free ?? '0';
      const required = request.side === 'buy' ? quoteQuantity : quantity;

      if (compareDecimalAmounts(required, available) > 0) {
        throw new Error(
          `Insufficient test balance for ${request.side === 'buy' ? quoteAsset : baseAsset}: requested ${required}, available ${available}`,
        );
      }

      this.repository.saveOrder(order);
      this.repository.saveTrades([trade]);

      if (request.side === 'buy') {
        const nextQuoteBalance = subtractDecimalAmounts(available, quoteQuantity);
        const baseAccount = this.db.get<{ free: string; locked: string }>(
          `
            SELECT free, locked
            FROM test_balances
            WHERE exchange_id = ?
              AND asset = ?
          `,
          this.exchangeId,
          baseAsset,
        );

        const nextBaseBalance = addDecimalAmounts(baseAccount?.free ?? '0', quantity);

        this.balanceService.depositTestBalance(baseAsset, nextBaseBalance, now);
        this.balanceService.withdrawTestBalance(quoteAsset, quoteQuantity, now);

        if (compareDecimalAmounts(nextQuoteBalance, '0') === 0) {
          this.balanceService.withdrawTestBalance(quoteAsset, available, now);
        }
      } else {
        const nextBaseBalance = subtractDecimalAmounts(available, quantity);
        const quoteAccount = this.db.get<{ free: string; locked: string }>(
          `
            SELECT free, locked
            FROM test_balances
            WHERE exchange_id = ?
              AND asset = ?
          `,
          this.exchangeId,
          quoteAsset,
        );

        const nextQuoteBalance = addDecimalAmounts(quoteAccount?.free ?? '0', quoteQuantity);

        this.balanceService.withdrawTestBalance(baseAsset, quantity, now);
        this.balanceService.depositTestBalance(quoteAsset, nextQuoteBalance, now);

        if (compareDecimalAmounts(nextBaseBalance, '0') === 0) {
          this.balanceService.withdrawTestBalance(baseAsset, available, now);
        }
      }
    });

    return {
      orderId,
      ...(request.clientOrderId ? { clientOrderId: request.clientOrderId } : {}),
      symbol: request.symbol.toUpperCase(),
      side: request.side,
      type: request.type,
      status: 'filled' satisfies ExchangeOrderStatus,
      quantity,
      executedQuantity: quantity,
      price: currentPrice,
    };
  }
}

function subtractDecimalAmounts(left: string, right: string): string {
  const leftParts = left.split('.');
  const rightParts = right.split('.');
  const scale = Math.max(leftParts[1]?.length ?? 0, rightParts[1]?.length ?? 0);
  const factor = 10n ** BigInt(scale);

  const toInteger = (value: string): bigint => {
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * factor + BigInt((fraction + '0'.repeat(scale)).slice(0, scale) || '0');
  };

  const result = toInteger(left) - toInteger(right);

  if (result < 0n) {
    throw new Error(`Decimal subtraction would become negative: ${left} - ${right}`);
  }

  const negative = result < 0n;
  const absolute = negative ? -result : result;
  const whole = absolute / factor;
  const fraction = absolute % factor;

  if (scale === 0) {
    return `${negative ? '-' : ''}${whole}`;
  }

  return `${negative ? '-' : ''}${whole}.${fraction.toString().padStart(scale, '0').replace(/0+$/, '') || '0'}`;
}
