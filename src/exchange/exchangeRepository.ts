import type { DatabaseAdapter } from '../database/databaseAdapter';
import { BaseRepository } from '../repositories/baseRepository';

export interface ExchangeRecord {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExchangeRow {
  id: string;
  name: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export class ExchangeRepository extends BaseRepository {
  constructor(db: DatabaseAdapter) {
    super(db);
  }

  create(exchange: ExchangeRecord): void {
    this.db.run(
      `
        INSERT INTO exchanges (
          id, name, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `,
      exchange.id,
      exchange.name,
      exchange.enabled ? 1 : 0,
      exchange.createdAt,
      exchange.updatedAt,
    );
  }

  getById(id: string): ExchangeRecord | undefined {
    const row = this.db.get<ExchangeRow>(
      `
        SELECT id, name, enabled, created_at, updated_at
        FROM exchanges
        WHERE id = ?
      `,
      id,
    );

    return row ? this.toRecord(row) : undefined;
  }

  getAll(): ExchangeRecord[] {
    return this.db
      .all<ExchangeRow>(
        `
          SELECT id, name, enabled, created_at, updated_at
          FROM exchanges
          ORDER BY id
        `,
      )
      .map((row) => this.toRecord(row));
  }

  setEnabled(id: string, enabled: boolean, updatedAt: string): void {
    this.db.run(
      `
        UPDATE exchanges
        SET enabled = ?, updated_at = ?
        WHERE id = ?
      `,
      enabled ? 1 : 0,
      updatedAt,
      id,
    );
  }

  private toRecord(row: ExchangeRow): ExchangeRecord {
    return {
      id: row.id,
      name: row.name,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
