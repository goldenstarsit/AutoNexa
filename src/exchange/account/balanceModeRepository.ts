import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { BaseRepository } from '../../repositories/baseRepository';
import {
  EXCHANGE_BALANCE_MODES,
  type ExchangeBalanceMode,
} from './balanceMode';

export interface BalanceModeRecord {
  id: ExchangeBalanceMode;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BalanceModeRow {
  id: string;
  name: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export class BalanceModeRepository extends BaseRepository {
  constructor(db: DatabaseAdapter) {
    super(db);
  }

  getById(id: ExchangeBalanceMode): BalanceModeRecord | undefined {
    const row = this.db.get<BalanceModeRow>(
      `
        SELECT id, name, enabled, created_at, updated_at
        FROM balance_modes
        WHERE id = ?
      `,
      id,
    );

    return row ? this.toRecord(row) : undefined;
  }

  getAll(): BalanceModeRecord[] {
    return this.db
      .all<BalanceModeRow>(
        `
          SELECT id, name, enabled, created_at, updated_at
          FROM balance_modes
          ORDER BY id
        `,
      )
      .map((row) => this.toRecord(row));
  }

  getEnabled(): BalanceModeRecord[] {
    return this.db
      .all<BalanceModeRow>(
        `
          SELECT id, name, enabled, created_at, updated_at
          FROM balance_modes
          WHERE enabled = 1
          ORDER BY id
        `,
      )
      .map((row) => this.toRecord(row));
  }

  setEnabled(
    id: ExchangeBalanceMode,
    enabled: boolean,
    updatedAt: string,
  ): void {
    this.db.run(
      `
        UPDATE balance_modes
        SET enabled = ?, updated_at = ?
        WHERE id = ?
      `,
      enabled ? 1 : 0,
      updatedAt,
      id,
    );
  }

  private toRecord(row: BalanceModeRow): BalanceModeRecord {
    if (!EXCHANGE_BALANCE_MODES.has(row.id)) {
      throw new Error(`Unsupported balance mode: ${row.id}`);
    }

    return {
      id: row.id as ExchangeBalanceMode,
      name: row.name,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
