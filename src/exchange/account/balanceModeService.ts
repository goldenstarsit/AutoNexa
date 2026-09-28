import type { DatabaseAdapter } from '../../database/databaseAdapter';
import {
  BalanceModeRepository,
} from './balanceModeRepository';
import type { ExchangeBalanceMode } from './balanceMode';

export class BalanceModeService {
  private readonly repository: BalanceModeRepository;

  constructor(db: DatabaseAdapter) {
    this.repository = new BalanceModeRepository(db);
  }

  isEnabled(id: ExchangeBalanceMode): boolean {
    return this.repository.getById(id)?.enabled === true;
  }
}
