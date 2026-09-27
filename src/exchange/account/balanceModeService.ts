import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { BalanceModeProvider } from './balanceModeProvider';
import {
  BalanceModeRepository,
  type BalanceModeRecord,
} from './balanceModeRepository';
import type { ExchangeBalanceMode } from './balanceMode';

export class BalanceModeService implements BalanceModeProvider {
  private readonly repository: BalanceModeRepository;

  constructor(db: DatabaseAdapter) {
    this.repository = new BalanceModeRepository(db);
  }

  getAll(): BalanceModeRecord[] {
    return this.repository.getAll();
  }

  getEnabled(): BalanceModeRecord[] {
    return this.repository.getEnabled();
  }

  getById(
    id: ExchangeBalanceMode,
  ): BalanceModeRecord | undefined {
    return this.repository.getById(id);
  }

  isEnabled(id: ExchangeBalanceMode): boolean {
    return this.repository.getById(id)?.enabled === true;
  }

  setEnabled(
    id: ExchangeBalanceMode,
    enabled: boolean,
    updatedAt: string = new Date().toISOString(),
  ): void {
    const mode = this.repository.getById(id);

    if (!mode) {
      throw new Error(`Balance mode not found: ${id}`);
    }

    this.repository.setEnabled(id, enabled, updatedAt);
  }
}
