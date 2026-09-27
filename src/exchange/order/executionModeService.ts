import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeOrderExecutionMode } from './exchangeOrder';
import type { ExecutionModeProvider } from './executionModeProvider';
import {
  ExecutionModeRepository,
  type ExecutionModeRecord,
} from './executionModeRepository';

export class ExecutionModeService implements ExecutionModeProvider {
  private readonly repository: ExecutionModeRepository;

  constructor(db: DatabaseAdapter) {
    this.repository = new ExecutionModeRepository(db);
  }

  getAll(): ExecutionModeRecord[] {
    return this.repository.getAll();
  }

  getEnabled(): ExecutionModeRecord[] {
    return this.repository.getEnabled();
  }

  getById(
    id: ExchangeOrderExecutionMode,
  ): ExecutionModeRecord | undefined {
    return this.repository.getById(id);
  }

  isEnabled(id: ExchangeOrderExecutionMode): boolean {
    return this.repository.getById(id)?.enabled === true;
  }

  setEnabled(
    id: ExchangeOrderExecutionMode,
    enabled: boolean,
    updatedAt: string = new Date().toISOString(),
  ): void {
    const mode = this.repository.getById(id);

    if (!mode) {
      throw new Error(`Execution mode not found: ${id}`);
    }

    this.repository.setEnabled(id, enabled, updatedAt);
  }
}
