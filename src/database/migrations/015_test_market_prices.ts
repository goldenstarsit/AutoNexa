import type { Migration } from './migrationRunner';

export const testMarketPricesMigration: Migration = {
  version: 15,
  name: 'test_market_prices',

  up(db) {
    db.exec(`
      CREATE TABLE test_market_prices (
        symbol TEXT PRIMARY KEY,
        price TEXT NOT NULL
      );
    `);
  },
};
