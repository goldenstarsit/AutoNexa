import { createDatabase } from '../database/database';
import type { DatabaseAdapter } from '../database/databaseAdapter';

export function createRepositoryDatabase(): DatabaseAdapter {
  return createDatabase();
}
