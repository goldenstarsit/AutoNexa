import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeOrderExecutionMode } from './exchangeOrder';
import type { ExecutionModeProvider } from './executionModeProvider';
import { ExecutionModeRepository } from './executionModeRepository';

export class ExecutionModeService implements ExecutionModeProvider {
  private readonly repository: ExecutionModeRepository;

  constructor(db: DatabaseAdapter) {
    this.repository = new ExecutionModeRepository(db);
  }

  isEnabled(id: ExchangeOrderExecutionMode): boolean {
    return this.repository.getById(id)?.enabled === true;
  }
}
