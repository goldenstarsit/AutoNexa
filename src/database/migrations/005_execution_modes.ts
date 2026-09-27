import type { Migration } from './migrationRunner';

export const executionModesMigration: Migration = {
  version: 5,
  name: 'execution_modes',
  up: (db) => {
    db.exec(`
      CREATE TABLE execution_modes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    const now = new Date().toISOString();

    const modes = [
      ['makerOnly', 'Maker Only'],
      ['takerOnly', 'Taker Only'],
      ['hybrid', 'Hybrid'],
    ] as const;

    for (const [id, name] of modes) {
      db.run(
        `
          INSERT INTO execution_modes (
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
