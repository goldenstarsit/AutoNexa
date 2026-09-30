import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { ExchangeOrderExecutionMode } from './exchangeOrder';
import type { ExecutionModeProvider } from './executionModeProvider';

export interface ExecutionModeRecord {
  id: ExchangeOrderExecutionMode;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionModeRow {
  id: string;
  name: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

const EXECUTION_MODE_IDS: ReadonlySet<string> = new Set([
  'makerOnly',
  'takerOnly',
  'hybrid',
]);

export class ExecutionModeRepository implements ExecutionModeProvider {
  constructor(public readonly db: DatabaseModel) {}

  isEnabled(id: ExchangeOrderExecutionMode): boolean {
    return this.getById(id)?.enabled === true;
  }

  getById(id: ExchangeOrderExecutionMode): ExecutionModeRecord | undefined {
    const row = this.db.get<ExecutionModeRow>(
      `
        SELECT id, name, enabled, created_at, updated_at
        FROM execution_modes
        WHERE id = ?
      `,
      id,
    );

    return row ? this.toRecord(row) : undefined;
  }

  private toRecord(row: ExecutionModeRow): ExecutionModeRecord {
    if (!EXECUTION_MODE_IDS.has(row.id)) {
      throw new Error(`Unsupported execution mode: ${row.id}`);
    }

    return {
      id: row.id as ExchangeOrderExecutionMode,
      name: row.name,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
