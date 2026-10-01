import { randomUUID } from 'node:crypto';
import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { ExchangeSymbolInfo } from '../market/exchangeMarket';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
  ExchangeOrderStatus,
} from '../../domain/exchange/exchangeOrder';
import { TestBalanceService } from '../account/testBalanceService';
import { compareDecimalAmounts, multiplyDecimalAmounts } from '../account/decimalAmount';
import { TestOrderRepository, type TestOrderRecord, type TestOrderTradeRecord } from './testOrderRepository';

export interface TestOrderExecutionMarket {
  getCurrentPrice(symbol: string): Promise<string>;
  getSymbolInfo(symbol: string): Promise<ExchangeSymbolInfo>;
}

export class TestOrderExecutionService {
  private readonly repository: TestOrderRepository;
  private readonly balanceService: TestBalanceService;

  constructor(
    private readonly db: DatabaseModel,
    private readonly exchangeId: string,
    private readonly market: TestOrderExecutionMarket,
  ) {
    this.repository = new TestOrderRepository(db);
    this.balanceService = new TestBalanceService(db, exchangeId);
  }

  async execute(request: ExchangeOrderRequest): Promise<ExchangeOrder> {
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

    const isMarket = request.type === 'market';
    const isLimit = request.type === 'limit' || request.type === 'makerOnly';

    if (!isMarket && !isLimit) {
      throw new Error(`Unsupported test order type: ${request.type}`);
    }

    const requestedPrice = request.price ?? currentPrice;
    const immediatelyFillable =
      isMarket ||
      (request.side === 'buy'
        ? compareDecimalAmounts(currentPrice, requestedPrice) <= 0
        : compareDecimalAmounts(currentPrice, requestedPrice) >= 0);

    const status: ExchangeOrderStatus = immediatelyFillable ? 'filled' : 'open';
    const executedQuantity = immediatelyFillable ? quantity : '0';
    const fillPrice = immediatelyFillable ? currentPrice : undefined;

    const order: TestOrderRecord = {
      id: orderId,
      exchangeId: this.exchangeId,
      symbol: request.symbol.toUpperCase(),
      side: request.side,
      type: request.type,
      executionMode: request.executionMode,
      status,
      quantity,
      executedQuantity,
      requestedPrice,
      ...(fillPrice ? { averageFillPrice: fillPrice } : {}),
      ...(request.clientOrderId ? { clientOrderId: request.clientOrderId } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const tradeId = `test-trade-${randomUUID()}`;
    const trade: TestOrderTradeRecord = {
      id: `test-trade-record-${randomUUID()}`,
      testOrderId: orderId,
      exchangeTradeId: tradeId,
      exchangeOrderId: orderId,
      symbol: request.symbol.toUpperCase(),
      side: request.side,
      price: fillPrice ?? requestedPrice,
      quantity,
      quoteQuantity: multiplyDecimalAmounts(quantity, fillPrice ?? requestedPrice),
      tradeTimestamp: timestamp,
      createdAt: now,
    };

    this.db.transaction(() => {
      this.repository.saveOrder(order);

      if (!immediatelyFillable) {
        return;
      }

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
      const required =
        request.side === 'buy'
          ? quoteQuantity
          : quantity;

      if (compareDecimalAmounts(required, available) > 0) {
        throw new Error(
          `Insufficient test balance for ${request.side === 'buy' ? quoteAsset : baseAsset}: requested ${required}, available ${available}`,
        );
      }

      this.repository.saveTrades([trade]);

      if (request.side === 'buy') {
        this.balanceService.withdrawTestBalance(quoteAsset, quoteQuantity, now);
        this.balanceService.depositTestBalance(baseAsset, quantity, now);
      } else {
        this.balanceService.withdrawTestBalance(baseAsset, quantity, now);
        this.balanceService.depositTestBalance(quoteAsset, quoteQuantity, now);
      }
    });

    return {
      orderId,
      ...(request.clientOrderId ? { clientOrderId: request.clientOrderId } : {}),
      symbol: request.symbol.toUpperCase(),
      side: request.side,
      type: request.type,
      status,
      quantity,
      executedQuantity,
      ...(requestedPrice ? { price: requestedPrice } : {}),
    };
  }

  async reconcileOrder(orderId: string): Promise<ExchangeOrder> {
    const existing = this.repository.getOrder(orderId);

    if (!existing) {
      throw new Error(`Test order not found: ${orderId}`);
    }

    if (existing.status === 'filled') {
      return this.getOrder(orderId);
    }

    const currentPrice = await this.market.getCurrentPrice(existing.symbol);
    const requestedPrice = existing.requestedPrice ?? currentPrice;

    const fillable =
      existing.type === 'market' ||
      (existing.side === 'buy'
        ? compareDecimalAmounts(currentPrice, requestedPrice) <= 0
        : compareDecimalAmounts(currentPrice, requestedPrice) >= 0);

    if (!fillable) {
      return this.getOrder(orderId);
    }

    const symbolInfo = await this.market.getSymbolInfo(existing.symbol);
    const quantity = existing.quantity;
    const quoteQuantity = multiplyDecimalAmounts(quantity, currentPrice);
    const now = new Date().toISOString();

    this.db.transaction(() => {
      const account = this.db.get<{ free: string }>(
        `
          SELECT free
          FROM test_balances
          WHERE exchange_id = ?
            AND asset = ?
        `,
        this.exchangeId,
        existing.side === 'buy' ? symbolInfo.quoteAsset : symbolInfo.baseAsset,
      );

      const available = account?.free ?? '0';
      const required =
        existing.side === 'buy'
          ? quoteQuantity
          : quantity;

      if (compareDecimalAmounts(required, available) > 0) {
        throw new Error(
          `Insufficient test balance to fill order ${orderId}: requested ${required}, available ${available}`,
        );
      }

      this.repository.updateOrder(
        orderId,
        'filled',
        quantity,
        currentPrice,
      );

      this.repository.saveTrades([{
        id: `test-trade-record-${randomUUID()}`,
        testOrderId: orderId,
        exchangeTradeId: `test-trade-${randomUUID()}`,
        exchangeOrderId: orderId,
        symbol: existing.symbol,
        side: existing.side,
        price: currentPrice,
        quantity,
        quoteQuantity,
        tradeTimestamp: Date.now(),
        createdAt: now,
      }]);

      if (existing.side === 'buy') {
        this.balanceService.withdrawTestBalance(
          symbolInfo.quoteAsset,
          quoteQuantity,
          now,
        );
        this.balanceService.depositTestBalance(
          symbolInfo.baseAsset,
          quantity,
          now,
        );
      } else {
        this.balanceService.withdrawTestBalance(
          symbolInfo.baseAsset,
          quantity,
          now,
        );
        this.balanceService.depositTestBalance(
          symbolInfo.quoteAsset,
          quoteQuantity,
          now,
        );
      }
    });

    return this.getOrder(orderId);
  }

  async getOrderAsync(orderId: string): Promise<ExchangeOrder> {
    return this.reconcileOrder(orderId);
  }

  getOrder(orderId: string): ExchangeOrder {
    const order = this.repository.getOrder(orderId);
    if (!order) {
      throw new Error(`Test order not found: ${orderId}`);
    }

    return {
      orderId: order.id,
      ...(order.clientOrderId ? { clientOrderId: order.clientOrderId } : {}),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      quantity: order.quantity,
      executedQuantity: order.executedQuantity,
      ...(order.requestedPrice ? { price: order.requestedPrice } : {}),
    };
  }

  async getTrades(symbol: string, orderId: string): Promise<ExchangeTrade[]> {
    const trades = this.repository.getTrades(orderId);

    if (trades.length > 0) {
      return trades.map((trade) => ({
        tradeId: trade.exchangeTradeId,
        orderId: trade.exchangeOrderId,
        symbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        quoteQuantity: trade.quoteQuantity,
        timestamp: trade.tradeTimestamp,
      }));
    }

    const order = this.repository.getOrder(orderId);
    if (!order || order.symbol.toUpperCase() !== symbol.toUpperCase()) {
      throw new Error(`Test order not found: ${symbol}:${orderId}`);
    }

    return [];
  }
}

