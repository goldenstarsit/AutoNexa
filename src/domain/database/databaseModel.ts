import type { DatabaseAdapter } from '../../database/databaseAdapter';

export interface DatabaseModel {
  readonly id: string;
  readonly adapter: DatabaseAdapter;
  close(): void;
}

export interface DatabaseModelFactory {
  create(): DatabaseModel;
}
