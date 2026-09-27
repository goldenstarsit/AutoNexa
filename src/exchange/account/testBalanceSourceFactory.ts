import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { TestBalanceService } from './testBalanceService';

export function createTestBalanceSource(
  db: DatabaseAdapter,
  exchangeId: string,
): TestBalanceService {
  return new TestBalanceService(db, exchangeId);
}
