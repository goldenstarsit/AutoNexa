import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { createDatabase } from '../../database/database';
import type {
  DatabaseModel,
  DatabaseModelFactory,
} from './databaseModel';

export class SQLiteDatabaseModel implements DatabaseModel {
  readonly id = 'sqlite';

  constructor(
    private readonly adapter: DatabaseAdapter,
  ) {}

  exec(sql: string): void {
    this.adapter.exec(sql);
  }

  run(
    sql: string,
    ...params: unknown[]
  ): {
    changes: number;
    lastInsertRowid: number | bigint;
  } {
    return this.adapter.run(sql, ...params);
  }

  get<T = unknown>(
    sql: string,
    ...params: unknown[]
  ): T | undefined {
    return this.adapter.get<T>(sql, ...params);
  }

  all<T = unknown>(
    sql: string,
    ...params: unknown[]
  ): T[] {
    return this.adapter.all<T>(sql, ...params);
  }

  transaction<T>(fn: () => T): T {
    return this.adapter.transaction(fn);
  }

  close(): void {
    this.adapter.close();
  }
}

export class SQLiteDatabaseModelFactory
  implements DatabaseModelFactory
{
  create(): DatabaseModel {
    return new SQLiteDatabaseModel(createDatabase());
  }
}
