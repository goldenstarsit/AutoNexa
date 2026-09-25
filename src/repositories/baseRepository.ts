import type { DatabaseAdapter } from '../database/databaseAdapter';
import type { Repository } from './repository';

export abstract class BaseRepository implements Repository {
  constructor(
    public readonly db: DatabaseAdapter,
  ) {}
}
