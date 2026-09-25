import type { DatabaseAdapter } from '../database/databaseAdapter';

export interface Repository {
  readonly db: DatabaseAdapter;
}
