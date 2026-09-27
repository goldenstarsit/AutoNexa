import type { Migration } from './migrationRunner';

export const strategyTypesMigration: Migration = {
  version: 3,
  name: 'strategy_types',
  up: (db) => {
    db.exec(`
      CREATE TABLE strategy_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    const now = new Date().toISOString();

    db.run(
      `
        INSERT INTO strategy_types (
          id,
          name,
          enabled,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      'dca',
      'DCA',
      1,
      now,
      now,
    );
  },
};
