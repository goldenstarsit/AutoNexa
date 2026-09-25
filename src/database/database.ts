import path from 'node:path';
import { SQLiteAdapter } from './adapters/sqliteAdapter';
import type { DatabaseAdapter } from './databaseAdapter';

const databasePath = path.join(process.cwd(), 'data', 'autonexa.db');

export function createDatabase(): DatabaseAdapter {
  return new SQLiteAdapter(databasePath);
}
