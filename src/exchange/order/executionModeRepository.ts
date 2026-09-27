import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { BaseRepository } from '../../repositories/baseRepository';
import type { ExchangeOrderExecutionMode } from './exchangeOrder';

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

export class ExecutionModeRepository extends BaseRepository {
  constructor(db: DatabaseAdapter) {
    super(db);
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

  getAll(): ExecutionModeRecord[] {
    return this.db
      .all<ExecutionModeRow>(
        `
          SELECT id, name, enabled, created_at, updated_at
          FROM execution_modes
          ORDER BY id
        `,
      )
      .map((row) => this.toRecord(row));
  }

  getEnabled(): ExecutionModeRecord[] {
    return this.db
      .all<ExecutionModeRow>(
        `
          SELECT id, name, enabled, created_at, updated_at
          FROM execution_modes
          WHERE enabled = 1
          ORDER BY id
        `,
      )
      .map((row) => this.toRecord(row));
  }

  setEnabled(
    id: ExchangeOrderExecutionMode,
    enabled: boolean,
    updatedAt: string,
  ): void {
    this.db.run(
      `
        UPDATE execution_modes
        SET enabled = ?, updated_at = ?
        WHERE id = ?
      `,
      enabled ? 1 : 0,
      updatedAt,
      id,
    );
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
