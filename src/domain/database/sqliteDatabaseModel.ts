import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { createDatabase } from '../../database/database';
import type { DatabaseModel, DatabaseModelFactory } from './databaseModel';

export class SQLiteDatabaseModel implements DatabaseModel {
  readonly id = 'sqlite';

  constructor(
    public readonly adapter: DatabaseAdapter,
  ) {}

  close(): void {
    this.adapter.close();
  }
}

export class SQLiteDatabaseModelFactory implements DatabaseModelFactory {
  create(): DatabaseModel {
    return new SQLiteDatabaseModel(createDatabase());
  }
}
