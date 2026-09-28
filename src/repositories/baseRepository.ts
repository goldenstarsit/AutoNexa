import type { DatabaseAdapter } from '../database/databaseAdapter';
export abstract class BaseRepository {
  constructor(
    public readonly db: DatabaseAdapter,
  ) {}
}
