import type { DatabaseModel } from '../../domain/database/databaseModel';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type {
  DcaInitialOrderFillRecord,
  DcaInitialOrderModel,
  DcaInitialOrderRecord,
} from '../../domain/strategy/dca/dcaInitialOrderModel';

type InitialOrderRow = {
  id: string;
  dca_configuration_id: string;
  dca_cycle_id: string;
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
  trigger_price: string | null;
  created_at: string;
  updated_at: string;
};

export class DcaInitialOrderRepository {
  constructor(private readonly db: DatabaseModel) {}

  getByCycle(cycleId: string): DcaInitialOrderModel | undefined {
    const row = this.db.get<InitialOrderRow>(
      `SELECT * FROM dca_initial_orders WHERE dca_cycle_id = ?`,
      cycleId,
    );

    return row
      ? newInitialOrderModel(this.mapOrder(row), this.getFills(row.id))
      : undefined;
  }

  saveOrder(
    configurationId: string,
    cycleId: string,
    order: ExchangeOrder,
    request: ExchangeOrderRequest,
    triggerPrice: string,
  ): DcaInitialOrderModel {
    if (this.getByCycle(cycleId)) {
      throw new Error(`DCA initial order already exists: ${cycleId}`);
    }

    const now = new Date().toISOString();
    const id = `${cycleId}-initial-order`;

    this.db.run(
      `INSERT INTO dca_initial_orders (
        id,
        dca_configuration_id,
        dca_cycle_id,
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
        trigger_price,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      configurationId,
      cycleId,
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
      triggerPrice,
      now,
      now,
    );

    return this.getByCycle(cycleId)!;
  }

  updateOrder(
    initialOrderId: string,
    order: ExchangeOrder,
  ): DcaInitialOrderModel {
    const existing = this.db.get<InitialOrderRow>(
      `SELECT * FROM dca_initial_orders WHERE id = ?`,
      initialOrderId,
    );

    if (!existing) {
      throw new Error(`DCA initial order not found: ${initialOrderId}`);
    }

    const now = new Date().toISOString();

    this.db.run(
      `UPDATE dca_initial_orders
       SET exchange_order_id = ?,
           client_order_id = ?,
           status = ?,
           quantity = ?,
           executed_quantity = ?,
           requested_price = ?,
           average_fill_price = ?,
           updated_at = ?
       WHERE id = ?`,
      order.orderId,
      order.clientOrderId ?? null,
      order.status,
      order.quantity,
      order.executedQuantity,
      order.price ?? existing.requested_price,
      existing.average_fill_price,
      now,
      initialOrderId,
    );

    return this.getByCycle(existing.dca_cycle_id)!;
  }

  getFills(initialOrderId: string): DcaInitialOrderFillRecord[] {
    const rows = this.db.all<{
      id: string;
      dca_initial_order_id: string;
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
      `SELECT *
       FROM dca_initial_order_fills
       WHERE dca_initial_order_id = ?
       ORDER BY trade_timestamp ASC, exchange_trade_id ASC`,
      initialOrderId,
    );

    return rows.map((row) => ({
      id: row.id,
      dcaInitialOrderId: row.dca_initial_order_id,
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

  saveFills(
    initialOrderId: string,
    trades: ExchangeTrade[],
  ): DcaInitialOrderFillRecord[] {
    const createdAt = new Date().toISOString();

    return trades.map((trade) => {
      const id = `${initialOrderId}-fill-${trade.tradeId}`;

      this.db.run(
        `INSERT OR IGNORE INTO dca_initial_order_fills (
          id,
          dca_initial_order_id,
          exchange_trade_id,
          exchange_order_id,
          symbol,
          side,
          price,
          quantity,
          quote_quantity,
          trade_timestamp,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        initialOrderId,
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
        dcaInitialOrderId: initialOrderId,
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

  private mapOrder(row: InitialOrderRow): DcaInitialOrderRecord {
    return {
      id: row.id,
      dcaConfigurationId: row.dca_configuration_id,
      dcaCycleId: row.dca_cycle_id,
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
      triggerPrice: row.trigger_price ?? undefined,
      averageFillPrice: row.average_fill_price ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function newInitialOrderModel(
  record: DcaInitialOrderRecord,
  fills: readonly DcaInitialOrderFillRecord[],
): DcaInitialOrderModel {
  return {
    ...record,
    fills,
  };
}
