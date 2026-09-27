import type { Migration } from './migrationRunner';

export const seedMexcExchangeMigration: Migration = {
  version: 4,
  name: 'seed_mexc_exchange',
  up: (db) => {
    const now = new Date().toISOString();

    db.run(
      `
        INSERT INTO exchanges (
          id,
          name,
          enabled,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      'mexc',
      'MEXC',
      1,
      now,
      now,
    );
  },
};
