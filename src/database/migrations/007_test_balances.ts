import type { Migration } from './migrationRunner';

export const testBalancesMigration: Migration = {
  version: 7,
  name: 'test_balances',
  up: (db) => {
    db.exec(`
      CREATE TABLE test_balances (
        exchange_id TEXT NOT NULL,
        asset TEXT NOT NULL,
        free TEXT NOT NULL DEFAULT '0',
        locked TEXT NOT NULL DEFAULT '0',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (exchange_id, asset)
      )
    `);
  },
};
