import type { Migration } from './migrationRunner';

export const dcaRuntimeOrdersMigration: Migration = {
  version: 10,
  name: 'dca_runtime_orders',
  up: (db) => {
    db.exec(`
      CREATE TABLE dca_runtime_orders (
        id TEXT PRIMARY KEY,
        dca_configuration_id TEXT NOT NULL,
        dca_cycle_id TEXT NOT NULL,
        dca_order_id TEXT NOT NULL,
        level INTEGER NOT NULL,
        exchange_order_id TEXT NOT NULL,
        client_order_id TEXT,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        type TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        quantity TEXT NOT NULL,
        executed_quantity TEXT NOT NULL,
        requested_price TEXT,
        average_fill_price TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (dca_cycle_id, level),
        FOREIGN KEY (dca_configuration_id) REFERENCES dca_configurations(id),
        FOREIGN KEY (dca_cycle_id) REFERENCES dca_cycles(id),
        FOREIGN KEY (dca_order_id) REFERENCES dca_orders(id)
      );

      CREATE TABLE dca_runtime_order_fills (
        id TEXT PRIMARY KEY,
        dca_runtime_order_id TEXT NOT NULL,
        exchange_trade_id TEXT NOT NULL,
        exchange_order_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        price TEXT NOT NULL,
        quantity TEXT NOT NULL,
        quote_quantity TEXT NOT NULL,
        trade_timestamp INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (dca_runtime_order_id, exchange_trade_id),
        FOREIGN KEY (dca_runtime_order_id)
          REFERENCES dca_runtime_orders(id)
      );
    `);
  },
};
