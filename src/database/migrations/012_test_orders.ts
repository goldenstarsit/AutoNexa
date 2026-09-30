import type { Migration } from './migrationRunner';

export const testOrdersMigration: Migration = {
  version: 12,
  name: 'test_orders',
  up: (db) => {
    db.exec(`
      CREATE TABLE test_orders (
        id TEXT PRIMARY KEY,
        exchange_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        type TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        quantity TEXT NOT NULL,
        executed_quantity TEXT NOT NULL,
        requested_price TEXT,
        average_fill_price TEXT,
        client_order_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (exchange_id) REFERENCES exchanges(id)
      );

      CREATE INDEX idx_test_orders_exchange_symbol
        ON test_orders (exchange_id, symbol);

      CREATE INDEX idx_test_orders_client_order_id
        ON test_orders (client_order_id);

      CREATE TABLE test_order_trades (
        id TEXT PRIMARY KEY,
        test_order_id TEXT NOT NULL,
        exchange_trade_id TEXT NOT NULL,
        exchange_order_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        price TEXT NOT NULL,
        quantity TEXT NOT NULL,
        quote_quantity TEXT NOT NULL,
        trade_timestamp INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (test_order_id, exchange_trade_id),
        FOREIGN KEY (test_order_id) REFERENCES test_orders(id)
      );

      CREATE INDEX idx_test_order_trades_order
        ON test_order_trades (test_order_id);

      CREATE INDEX idx_test_order_trades_exchange_order
        ON test_order_trades (exchange_order_id);
    `);
  },
};
