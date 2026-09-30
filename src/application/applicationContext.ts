import { createDatabase } from '../database/database';
import type { DatabaseAdapter } from '../database/databaseAdapter';
import { ExchangeService } from '../exchange/exchangeService';
import { DcaStrategyService } from '../strategy/dca/dcaStrategyService';

export class ApplicationContext {
  readonly db: DatabaseAdapter;
  readonly exchanges: ExchangeService;
  readonly dcaStrategy: DcaStrategyService;

  constructor() {
    this.db = createDatabase();
    this.exchanges = new ExchangeService(this.db);
    this.dcaStrategy = new DcaStrategyService(this.db);
  }

  close(): void {
    this.db.close();
  }
}
