import type { Migration } from './migrationRunner';

export const dcaConfigurationsMigration: Migration = {
  version: 8,
  name: 'dca_configurations',
  up: (db) => {
    db.exec(`
      CREATE TABLE dca_configurations (
        id TEXT PRIMARY KEY,
        strategy_type_id TEXT NOT NULL,
        name TEXT NOT NULL,
        balance_mode_id TEXT NOT NULL,
        exchange_id TEXT NOT NULL,
        execution_mode_id TEXT NOT NULL,
        symbol TEXT NOT NULL UNIQUE,
        take_profit_percent TEXT NOT NULL,
        stop_loss_percent TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (strategy_type_id) REFERENCES strategy_types(id),
        FOREIGN KEY (balance_mode_id) REFERENCES balance_modes(id),
        FOREIGN KEY (exchange_id) REFERENCES exchanges(id),
        FOREIGN KEY (execution_mode_id) REFERENCES execution_modes(id)
      );

      CREATE TABLE dca_orders (
        id TEXT PRIMARY KEY,
        drop_percent TEXT NOT NULL UNIQUE
      );

      CREATE TABLE dca_configuration_orders (
        id TEXT PRIMARY KEY,
        dca_configuration_id TEXT NOT NULL,
        dca_order_id TEXT NOT NULL,
        level INTEGER NOT NULL,
        UNIQUE (dca_configuration_id, dca_order_id),
        UNIQUE (dca_configuration_id, level),
        FOREIGN KEY (dca_configuration_id) REFERENCES dca_configurations(id),
        FOREIGN KEY (dca_order_id) REFERENCES dca_orders(id)
      );
    `);

    const now = new Date().toISOString();

    const configurations = [
      ['dca-btcusdt', 'DCA BTCUSDT', 'BTCUSDT'],
      ['dca-ethusdt', 'DCA ETHUSDT', 'ETHUSDT'],
      ['dca-bnbusdt', 'DCA BNBUSDT', 'BNBUSDT'],
      ['dca-solusdt', 'DCA SOLUSDT', 'SOLUSDT'],
      ['dca-trxusdt', 'DCA TRXUSDT', 'TRXUSDT'],
    ] as const;

    for (const [id, name, symbol] of configurations) {
      db.run(
        `
          INSERT INTO dca_configurations (
            id,
            strategy_type_id,
            name,
            balance_mode_id,
            exchange_id,
            execution_mode_id,
            symbol,
            take_profit_percent,
            stop_loss_percent,
            enabled,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        id,
        'dca',
        name,
        'live',
        'mexc',
        'hybrid',
        symbol,
        '1',
        '50',
        0,
        now,
        now,
      );
    }

    const drops = ['1', '3', '6', '10', '15', '21', '28', '36', '45'] as const;

    for (let index = 0; index < drops.length; index += 1) {
      db.run(
        `
          INSERT INTO dca_orders (id, drop_percent)
          VALUES (?, ?)
        `,
        `dca-order-${index + 1}`,
        drops[index],
      );
    }

    for (const [configurationId] of configurations) {
      for (let index = 0; index < drops.length; index += 1) {
        db.run(
          `
            INSERT INTO dca_configuration_orders (
              id,
              dca_configuration_id,
              dca_order_id,
              level
            )
            VALUES (?, ?, ?, ?)
          `,
          `${configurationId}-order-${index + 1}`,
          configurationId,
          `dca-order-${index + 1}`,
          index + 1,
        );
      }
    }
  },
};
