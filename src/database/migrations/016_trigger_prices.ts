import type { Migration } from './migrationRunner';

export const triggerPricesMigration: Migration = {
  version: 16,
  name: 'trigger_prices',
  up: (db) => {
    db.exec(`
      ALTER TABLE dca_initial_orders
        ADD COLUMN trigger_price TEXT;

      ALTER TABLE dca_runtime_orders
        ADD COLUMN trigger_price TEXT;
    `);
  },
};
