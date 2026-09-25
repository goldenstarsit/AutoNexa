import type { DatabaseAdapter } from '../databaseAdapter';

export interface Migration {
  version: number;
  name: string;
  up(db: DatabaseAdapter): void;
}

export function runMigrations(
  db: DatabaseAdapter,
  migrations: Migration[],
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    db
      .all<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version',
      )
      .map((migration) => migration.version),
  );

  const pending = [...migrations]
    .filter((migration) => !applied.has(migration.version))
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    db.transaction(() => {
      migration.up(db);
      db.run(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
    });
  }
}
