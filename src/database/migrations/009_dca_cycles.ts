import type { Migration } from './migrationRunner';

export const dcaCyclesMigration: Migration = {
  version: 9,
  name: 'dca_cycles',
  up: (db) => {
    db.exec(`
      CREATE TABLE dca_cycles (
        id TEXT PRIMARY KEY,
        dca_configuration_id TEXT NOT NULL,
        cycle_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        initial_entry_price TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (dca_configuration_id, cycle_number),
        FOREIGN KEY (dca_configuration_id)
          REFERENCES dca_configurations(id)
      );
    `);
  },
};
