import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { BalanceSource } from './balanceSource';
import type { TestBalanceOperations } from './testBalanceOperations';
import { TestBalanceService } from './testBalanceService';

export function createTestBalanceSource(
  db: DatabaseAdapter,
  exchangeId: string,
): BalanceSource & TestBalanceOperations {
  return new TestBalanceService(db, exchangeId);
}
