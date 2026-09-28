import type { DatabaseAdapter } from '../../database/databaseAdapter';
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

export class BalanceModeRepository {
  constructor(public readonly db: DatabaseAdapter) {}

  isEnabled(id: ExchangeBalanceMode): boolean {
    return this.getById(id)?.enabled === true;
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
