import type { Migration } from './migrationRunner';

export const dcaCycleEntryTotalsMigration: Migration = {
  version: 11,
  name: 'dca_cycle_entry_totals',
  up: (db) => {
    db.exec(`
      ALTER TABLE dca_cycles
        ADD COLUMN entry_quantity TEXT;

      ALTER TABLE dca_cycles
        ADD COLUMN entry_quote_quantity TEXT;

      ALTER TABLE dca_cycles
        ADD COLUMN average_entry_price TEXT;
    `);
  },
};
