import type { DatabaseModel } from '../../domain/database/databaseModel';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../exchange/order/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/trade/exchangeTrade';

export interface DcaRuntimeOrderRecord {
  id: string;
  dcaConfigurationId: string;
  dcaCycleId: string;
  dcaOrderId: string;
  level: number;
  exchangeOrderId: string;
  clientOrderId?: string;
  symbol: string;
  side: ExchangeOrder['side'];
  type: ExchangeOrder['type'];
  executionMode: ExchangeOrderRequest['executionMode'];
  status: ExchangeOrder['status'];
  quantity: string;
  executedQuantity: string;
  requestedPrice?: string;
  averageFillPrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DcaRuntimeOrderFillRecord {
  id: string;
  dcaRuntimeOrderId: string;
  exchangeTradeId: string;
  exchangeOrderId: string;
  symbol: string;
  side: ExchangeTrade['side'];
  price: string;
  quantity: string;
  quoteQuantity: string;
  tradeTimestamp: number;
  createdAt: string;
}

type RuntimeOrderRow = {
  id: string;
  dca_configuration_id: string;
  dca_cycle_id: string;
  dca_order_id: string;
  level: number;
  exchange_order_id: string;
  client_order_id: string | null;
  symbol: string;
  side: ExchangeOrder['side'];
  type: ExchangeOrder['type'];
  execution_mode: ExchangeOrderRequest['executionMode'];
  status: ExchangeOrder['status'];
  quantity: string;
  executed_quantity: string;
  requested_price: string | null;
  average_fill_price: string | null;
  created_at: string;
  updated_at: string;
};

export class DcaOrderRepository {
  constructor(private readonly db: DatabaseModel) {}

  getByCycleAndLevel(
    cycleId: string,
    level: number,
  ): DcaRuntimeOrderRecord | undefined {
    const row = this.db.get<RuntimeOrderRow>(
      `
        SELECT *
        FROM dca_runtime_orders
        WHERE dca_cycle_id = ? AND level = ?
      `,
      cycleId,
      level,
    );

    return row ? this.mapOrder(row) : undefined;
  }

  saveOrder(
    configurationId: string,
    cycleId: string,
    dcaOrderId: string,
    level: number,
    order: ExchangeOrder,
    request: ExchangeOrderRequest,
  ): DcaRuntimeOrderRecord {
    if (this.getByCycleAndLevel(cycleId, level)) {
      throw new Error(
        `DCA runtime order already exists: ${cycleId}:level-${level}`,
      );
    }

    const now = new Date().toISOString();
    const id = `${cycleId}-dca-order-${level}`;

    this.db.run(
      `
        INSERT INTO dca_runtime_orders (
          id,
          dca_configuration_id,
          dca_cycle_id,
          dca_order_id,
          level,
          exchange_order_id,
          client_order_id,
          symbol,
          side,
          type,
          execution_mode,
          status,
          quantity,
          executed_quantity,
          requested_price,
          average_fill_price,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      configurationId,
      cycleId,
      dcaOrderId,
      level,
      order.orderId,
      order.clientOrderId ?? null,
      order.symbol,
      order.side,
      order.type,
      request.executionMode,
      order.status,
      order.quantity,
      order.executedQuantity,
      order.price ?? request.price ?? null,
      null,
      now,
      now,
    );

    return this.getByCycleAndLevel(cycleId, level)!;
  }

  saveFills(
    runtimeOrderId: string,
    trades: ExchangeTrade[],
  ): DcaRuntimeOrderFillRecord[] {
    const createdAt = new Date().toISOString();

    return trades.map((trade) => {
      const id = `${runtimeOrderId}-fill-${trade.tradeId}`;

      this.db.run(
        `
          INSERT OR IGNORE INTO dca_runtime_order_fills (
            id,
            dca_runtime_order_id,
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
        id,
        runtimeOrderId,
        trade.tradeId,
        trade.orderId,
        trade.symbol,
        trade.side,
        trade.price,
        trade.quantity,
        trade.quoteQuantity,
        trade.timestamp,
        createdAt,
      );

      return {
        id,
        dcaRuntimeOrderId: runtimeOrderId,
        exchangeTradeId: trade.tradeId,
        exchangeOrderId: trade.orderId,
        symbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        quoteQuantity: trade.quoteQuantity,
        tradeTimestamp: trade.timestamp,
        createdAt,
      };
    });
  }

  getFillsByCycle(cycleId: string): DcaRuntimeOrderFillRecord[] {
    const rows = this.db.all<{
      id: string;
      dca_runtime_order_id: string;
      exchange_trade_id: string;
      exchange_order_id: string;
      symbol: string;
      side: ExchangeTrade['side'];
      price: string;
      quantity: string;
      quote_quantity: string;
      trade_timestamp: number;
      created_at: string;
    }>(
      `
        SELECT
          fills.id,
          fills.dca_runtime_order_id,
          fills.exchange_trade_id,
          fills.exchange_order_id,
          fills.symbol,
          fills.side,
          fills.price,
          fills.quantity,
          fills.quote_quantity,
          fills.trade_timestamp,
          fills.created_at
        FROM dca_runtime_order_fills AS fills
        INNER JOIN dca_runtime_orders AS orders
          ON orders.id = fills.dca_runtime_order_id
        WHERE orders.dca_cycle_id = ?
        ORDER BY fills.trade_timestamp ASC, fills.exchange_trade_id ASC
      `,
      cycleId,
    );

    return rows.map((row) => ({
      id: row.id,
      dcaRuntimeOrderId: row.dca_runtime_order_id,
      exchangeTradeId: row.exchange_trade_id,
      exchangeOrderId: row.exchange_order_id,
      symbol: row.symbol,
      side: row.side,
      price: row.price,
      quantity: row.quantity,
      quoteQuantity: row.quote_quantity,
      tradeTimestamp: row.trade_timestamp,
      createdAt: row.created_at,
    }));
  }

  getFills(runtimeOrderId: string): DcaRuntimeOrderFillRecord[] {
    const rows = this.db.all<{
      id: string;
      dca_runtime_order_id: string;
      exchange_trade_id: string;
      exchange_order_id: string;
      symbol: string;
      side: ExchangeTrade['side'];
      price: string;
      quantity: string;
      quote_quantity: string;
      trade_timestamp: number;
      created_at: string;
    }>(
      `
        SELECT
          id,
          dca_runtime_order_id,
          exchange_trade_id,
          exchange_order_id,
          symbol,
          side,
          price,
          quantity,
          quote_quantity,
          trade_timestamp,
          created_at
        FROM dca_runtime_order_fills
        WHERE dca_runtime_order_id = ?
        ORDER BY trade_timestamp ASC, exchange_trade_id ASC
      `,
      runtimeOrderId,
    );

    return rows.map((row) => ({
      id: row.id,
      dcaRuntimeOrderId: row.dca_runtime_order_id,
      exchangeTradeId: row.exchange_trade_id,
      exchangeOrderId: row.exchange_order_id,
      symbol: row.symbol,
      side: row.side,
      price: row.price,
      quantity: row.quantity,
      quoteQuantity: row.quote_quantity,
      tradeTimestamp: row.trade_timestamp,
      createdAt: row.created_at,
    }));
  }

  private mapOrder(row: RuntimeOrderRow): DcaRuntimeOrderRecord {
    return {
      id: row.id,
      dcaConfigurationId: row.dca_configuration_id,
      dcaCycleId: row.dca_cycle_id,
      dcaOrderId: row.dca_order_id,
      level: row.level,
      exchangeOrderId: row.exchange_order_id,
      clientOrderId: row.client_order_id ?? undefined,
      symbol: row.symbol,
      side: row.side,
      type: row.type,
      executionMode: row.execution_mode,
      status: row.status,
      quantity: row.quantity,
      executedQuantity: row.executed_quantity,
      requestedPrice: row.requested_price ?? undefined,
      averageFillPrice: row.average_fill_price ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
