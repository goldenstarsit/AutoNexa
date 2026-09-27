import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { TestBalanceSource } from './sources/testBalanceSource';
import { TestBalanceService } from './testBalanceService';

export function createTestBalanceSource(
  db: DatabaseAdapter,
  exchangeId: string,
): TestBalanceSource {
  return new TestBalanceService(db, exchangeId);
}
