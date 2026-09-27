import { createRepositoryDatabase } from '../repositories/repositoryFactory';
import type { DatabaseAdapter } from '../database/databaseAdapter';
import { TestBalanceService } from '../exchange/account/testBalanceService';

export class ApplicationContext {
  readonly db: DatabaseAdapter;

  constructor() {
    this.db = createRepositoryDatabase();
  }

  getTestBalanceService(exchangeId: string): TestBalanceService {
    return new TestBalanceService(this.db, exchangeId);
  }

  close(): void {
    this.db.close();
  }
}
