import type { Migration } from './migrationRunner';

export const exchangesMigration: Migration = {
  version: 2,
  name: 'exchanges',
  up: (db) => {
    db.exec(`
      CREATE TABLE exchanges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  },
};
