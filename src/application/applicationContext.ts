import { createRepositoryDatabase } from '../repositories/repositoryFactory';
import type { DatabaseAdapter } from '../database/databaseAdapter';

export class ApplicationContext {
  readonly db: DatabaseAdapter;

  constructor() {
    this.db = createRepositoryDatabase();
  }

  close(): void {
    this.db.close();
  }
}
