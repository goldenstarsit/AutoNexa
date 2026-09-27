import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeAssetBalance } from './exchangeAccount';

interface TestBalanceRow {
  exchange_id: string;
  asset: string;
  free: string;
  locked: string;
}

export class TestBalanceRepository {
  constructor(private readonly db: DatabaseAdapter) {}

  getAll(exchangeId: string): ExchangeAssetBalance[] {
    return this.db
      .all<TestBalanceRow>(
        `
          SELECT exchange_id, asset, free, locked
          FROM test_balances
          WHERE exchange_id = ?
          ORDER BY asset
        `,
        exchangeId,
      )
      .map((row) => ({
        asset: row.asset,
        free: row.free,
        locked: row.locked,
      }));
  }

  get(
    exchangeId: string,
    asset: string,
  ): ExchangeAssetBalance | undefined {
    const row = this.db.get<TestBalanceRow>(
      `
        SELECT exchange_id, asset, free, locked
        FROM test_balances
        WHERE exchange_id = ? AND asset = ?
      `,
      exchangeId,
      asset,
    );

    if (!row) {
      return undefined;
    }

    return {
      asset: row.asset,
      free: row.free,
      locked: row.locked,
    };
  }

  upsert(
    exchangeId: string,
    balance: ExchangeAssetBalance,
    updatedAt: string,
  ): void {
    this.db.run(
      `
        INSERT INTO test_balances (
          exchange_id,
          asset,
          free,
          locked,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(exchange_id, asset)
        DO UPDATE SET
          free = excluded.free,
          locked = excluded.locked,
          updated_at = excluded.updated_at
      `,
      exchangeId,
      balance.asset,
      balance.free,
      balance.locked,
      updatedAt,
      updatedAt,
    );
  }
}
