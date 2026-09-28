import { createDatabase } from '../database/database';
import type { DatabaseAdapter } from '../database/databaseAdapter';
import { ExchangeService } from '../exchange/exchangeService';

export class ApplicationContext {
  readonly db: DatabaseAdapter;
  readonly exchanges: ExchangeService;

  constructor() {
    this.db = createDatabase();
    this.exchanges = new ExchangeService(this.db);
  }

  close(): void {
    this.db.close();
  }
}
