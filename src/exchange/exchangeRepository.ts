import type { DatabaseModel } from '../domain/database/databaseModel';

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

export class ExchangeRepository {
  constructor(public readonly db: DatabaseModel) {}

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
