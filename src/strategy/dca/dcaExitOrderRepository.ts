import type { DatabaseModel } from '../../domain/database/databaseModel';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type {
  DcaExitOrderModel as DcaExitOrderDomainModel,
  DcaExitOrderRecord,
  DcaExitOrderFillRecord,
  DcaExitType,
} from '../../domain/strategy/dca/dcaExitOrderModel';
import { DcaExitOrderModel } from './models/dcaExitOrderModel';

type ExitOrderRow = {
  id: string;
  dca_configuration_id: string;
  dca_cycle_id: string;
  exit_type: DcaExitType;
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

export class DcaExitOrderRepository {
  constructor(private readonly db: DatabaseModel) {}

  getByCycleAndType(
    cycleId: string,
    exitType: DcaExitType,
  ): DcaExitOrderDomainModel | undefined {
    const row = this.db.get<ExitOrderRow>(
      `
        SELECT *
        FROM dca_exit_orders
        WHERE dca_cycle_id = ? AND exit_type = ?
      `,
      cycleId,
      exitType,
    );

    return row
      ? new DcaExitOrderModel(this.mapOrder(row), this.getFillsByOrderId(row.id))
      : undefined;
  }

  saveOrder(
    configurationId: string,
    cycleId: string,
    exitType: DcaExitType,
    order: ExchangeOrder,
    request: ExchangeOrderRequest,
  ): DcaExitOrderDomainModel {
    if (this.getByCycleAndType(cycleId, exitType)) {
      throw new Error(
        `DCA exit order already exists: ${cycleId}:${exitType}`,
      );
    }

    const now = new Date().toISOString();
    const id = `${cycleId}-${exitType}-exit`;

    this.db.run(
      `
        INSERT INTO dca_exit_orders (
          id,
          dca_configuration_id,
          dca_cycle_id,
          exit_type,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      configurationId,
      cycleId,
      exitType,
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

    return this.getByCycleAndType(cycleId, exitType)!;
  }

  saveFills(
    exitOrderId: string,
    trades: ExchangeTrade[],
  ): DcaExitOrderFillRecord[] {
    const createdAt = new Date().toISOString();

    return trades.map((trade) => {
      const id = `${exitOrderId}-fill-${trade.tradeId}`;

      this.db.run(
        `
          INSERT OR IGNORE INTO dca_exit_order_fills (
            id,
            dca_exit_order_id,
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
        exitOrderId,
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
        dcaExitOrderId: exitOrderId,
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

  getFills(exitOrderId: string): DcaExitOrderFillRecord[] {
    const rows = this.db.all<{
      id: string;
      dca_exit_order_id: string;
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
          dca_exit_order_id,
          exchange_trade_id,
          exchange_order_id,
          symbol,
          side,
          price,
          quantity,
          quote_quantity,
          trade_timestamp,
          created_at
        FROM dca_exit_order_fills
        WHERE dca_exit_order_id = ?
        ORDER BY trade_timestamp ASC, exchange_trade_id ASC
      `,
      exitOrderId,
    );

    return rows.map((row) => ({
      id: row.id,
      dcaExitOrderId: row.dca_exit_order_id,
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

  private getFillsByOrderId(exitOrderId: string): DcaExitOrderFillRecord[] {
    return this.getFills(exitOrderId);
  }

  private mapOrder(row: ExitOrderRow): DcaExitOrderRecord {
    return {
      id: row.id,
      dcaConfigurationId: row.dca_configuration_id,
      dcaCycleId: row.dca_cycle_id,
      exitType: row.exit_type,
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
