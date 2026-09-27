import { createRepositoryDatabase } from '../repositories/repositoryFactory';
import type { DatabaseAdapter } from '../database/databaseAdapter';
import { ExchangeService } from '../exchange/exchangeService';

export class ApplicationContext {
  readonly db: DatabaseAdapter;
  readonly exchanges: ExchangeService;

  constructor() {
    this.db = createRepositoryDatabase();
    this.exchanges = new ExchangeService(this.db);
  }

  close(): void {
    this.db.close();
  }
}
