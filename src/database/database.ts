import path from 'node:path';
import { SQLiteAdapter } from './adapters/sqliteAdapter';
import type { DatabaseAdapter } from './databaseAdapter';
import { migrations } from './migrations';
import { runMigrations } from './migrations/migrationRunner';

const databasePath = path.join(process.cwd(), 'data', 'autonexa.db');

export function createDatabase(): DatabaseAdapter {
  const db = new SQLiteAdapter(databasePath);
  runMigrations(db, migrations);
  return db;
}
