import type { Migration } from './migrationRunner';

export const balanceModesMigration: Migration = {
  version: 6,
  name: 'balance_modes',
  up: (db) => {
    db.exec(`
      CREATE TABLE balance_modes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    const now = new Date().toISOString();

    const modes = [
      ['live', 'Live Balance'],
      ['test', 'Test Balance'],
    ] as const;

    for (const [id, name] of modes) {
      db.run(
        `
          INSERT INTO balance_modes (
            id,
            name,
            enabled,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        id,
        name,
        1,
        now,
        now,
      );
    }
  },
};
