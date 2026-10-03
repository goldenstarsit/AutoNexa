import type { DatabaseModel } from '../../../domain/database/databaseModel';

export class MexcTestMarketPriceRepository {
  constructor(private readonly db: DatabaseModel) {}

  get(symbol: string): string | undefined {
    const row = this.db.get<{ price: string }>(
      `
        SELECT price
        FROM test_market_prices
        WHERE symbol = ?
      `,
      symbol.toUpperCase(),
    );

    return row?.price;
  }

  set(symbol: string, price: string): void {
    this.db.run(
      `
        INSERT INTO test_market_prices (symbol, price)
        VALUES (?, ?)
        ON CONFLICT(symbol)
        DO UPDATE SET price = excluded.price
      `,
      symbol.toUpperCase(),
      price,
    );
  }

  clear(symbol: string): void {
    this.db.run(
      `
        DELETE FROM test_market_prices
        WHERE symbol = ?
      `,
      symbol.toUpperCase(),
    );
  }
}
