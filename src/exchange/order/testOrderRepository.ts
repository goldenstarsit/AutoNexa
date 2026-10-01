import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { ExchangeOrderStatus, ExchangeOrderType, ExchangeOrderExecutionMode, ExchangeOrderSide } from '../../domain/exchange/exchangeOrder';

export interface TestOrderRecord {
  id: string;
  exchangeId: string;
  symbol: string;
  side: ExchangeOrderSide;
  type: ExchangeOrderType;
  executionMode: ExchangeOrderExecutionMode;
  status: ExchangeOrderStatus;
  quantity: string;
  executedQuantity: string;
  requestedPrice?: string;
  averageFillPrice?: string;
  clientOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestOrderTradeRecord {
  id: string;
  testOrderId: string;
  exchangeTradeId: string;
  exchangeOrderId: string;
  symbol: string;
  side: ExchangeOrderSide;
  price: string;
  quantity: string;
  quoteQuantity: string;
  tradeTimestamp: number;
  createdAt: string;
}

interface TestOrderRow {
  id: string;
  exchange_id: string;
  symbol: string;
  side: ExchangeOrderSide;
  type: ExchangeOrderType;
  execution_mode: ExchangeOrderExecutionMode;
  status: ExchangeOrderStatus;
  quantity: string;
  executed_quantity: string;
  requested_price: string | null;
  average_fill_price: string | null;
  client_order_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TestOrderTradeRow {
  id: string;
  test_order_id: string;
  exchange_trade_id: string;
  exchange_order_id: string;
  symbol: string;
  side: ExchangeOrderSide;
  price: string;
  quantity: string;
  quote_quantity: string;
  trade_timestamp: number;
  created_at: string;
}

function mapOrder(row: TestOrderRow): TestOrderRecord {
  return {
    id: row.id,
    exchangeId: row.exchange_id,
    symbol: row.symbol,
    side: row.side,
    type: row.type,
    executionMode: row.execution_mode,
    status: row.status,
    quantity: row.quantity,
    executedQuantity: row.executed_quantity,
    ...(row.requested_price !== null ? { requestedPrice: row.requested_price } : {}),
    ...(row.average_fill_price !== null ? { averageFillPrice: row.average_fill_price } : {}),
    ...(row.client_order_id !== null ? { clientOrderId: row.client_order_id } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrade(row: TestOrderTradeRow): TestOrderTradeRecord {
  return {
    id: row.id,
    testOrderId: row.test_order_id,
    exchangeTradeId: row.exchange_trade_id,
    exchangeOrderId: row.exchange_order_id,
    symbol: row.symbol,
    side: row.side,
    price: row.price,
    quantity: row.quantity,
    quoteQuantity: row.quote_quantity,
    tradeTimestamp: row.trade_timestamp,
    createdAt: row.created_at,
  };
}

export class TestOrderRepository {
  constructor(private readonly db: DatabaseModel) {}

  saveOrder(order: TestOrderRecord): void {
    this.db.run(
      `
        INSERT INTO test_orders (
          id,
          exchange_id,
          symbol,
          side,
          type,
          execution_mode,
          status,
          quantity,
          executed_quantity,
          requested_price,
          average_fill_price,
          client_order_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      order.id,
      order.exchangeId,
      order.symbol,
      order.side,
      order.type,
      order.executionMode,
      order.status,
      order.quantity,
      order.executedQuantity,
      order.requestedPrice ?? null,
      order.averageFillPrice ?? null,
      order.clientOrderId ?? null,
      order.createdAt,
      order.updatedAt,
    );
  }

  updateOrder(
    orderId: string,
    status: ExchangeOrderStatus,
    executedQuantity: string,
    averageFillPrice?: string,
  ): void {
    this.db.run(
      `
        UPDATE test_orders
        SET
          status = ?,
          executed_quantity = ?,
          average_fill_price = COALESCE(?, average_fill_price),
          updated_at = ?
        WHERE id = ?
      `,
      status,
      executedQuantity,
      averageFillPrice ?? null,
      new Date().toISOString(),
      orderId,
    );
  }

  saveTrades(trades: TestOrderTradeRecord[]): void {
    for (const trade of trades) {
      this.db.run(
        `
          INSERT INTO test_order_trades (
            id,
            test_order_id,
            exchange_trade_id,
            exchange_order_id,
            symbol,
            side,
            price,
            quantity,
            quote_quantity,
            trade_timestamp,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        trade.id,
        trade.testOrderId,
        trade.exchangeTradeId,
        trade.exchangeOrderId,
        trade.symbol,
        trade.side,
        trade.price,
        trade.quantity,
        trade.quoteQuantity,
        trade.tradeTimestamp,
        trade.createdAt,
      );
    }
  }

  getOrder(id: string): TestOrderRecord | undefined {
    const row = this.db.get<TestOrderRow>(
      `
        SELECT
          id,
          exchange_id,
          symbol,
          side,
          type,
          execution_mode,
          status,
          quantity,
          executed_quantity,
          requested_price,
          average_fill_price,
          client_order_id,
          created_at,
          updated_at
        FROM test_orders
        WHERE id = ?
      `,
      id,
    );

    return row ? mapOrder(row) : undefined;
  }

  getTrades(orderId: string): TestOrderTradeRecord[] {
    const rows = this.db.all<TestOrderTradeRow>(
      `
        SELECT
          id,
          test_order_id,
          exchange_trade_id,
          exchange_order_id,
          symbol,
          side,
          price,
          quantity,
          quote_quantity,
          trade_timestamp,
          created_at
        FROM test_order_trades
        WHERE test_order_id = ?
        ORDER BY trade_timestamp, id
      `,
      orderId,
    );

    return rows.map(mapTrade);
  }

  getOpenOrders(exchangeId: string, symbol?: string): TestOrderRecord[] {
    const rows = symbol
      ? this.db.all<TestOrderRow>(
          `
            SELECT
              id,
              exchange_id,
              symbol,
              side,
              type,
              execution_mode,
              status,
              quantity,
              executed_quantity,
              requested_price,
              average_fill_price,
              client_order_id,
              created_at,
              updated_at
            FROM test_orders
            WHERE exchange_id = ?
              AND symbol = ?
              AND status IN ('open', 'partiallyFilled')
            ORDER BY created_at, id
          `,
          exchangeId,
          symbol,
        )
      : this.db.all<TestOrderRow>(
          `
            SELECT
              id,
              exchange_id,
              symbol,
              side,
              type,
              execution_mode,
              status,
              quantity,
              executed_quantity,
              requested_price,
              average_fill_price,
              client_order_id,
              created_at,
              updated_at
            FROM test_orders
            WHERE exchange_id = ?
              AND status IN ('open', 'partiallyFilled')
            ORDER BY created_at, id
          `,
          exchangeId,
        );

    return rows.map(mapOrder);
  }
}
