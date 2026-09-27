import type { Migration } from './migrationRunner';
import { initialMigration } from './001_initial';
import { exchangesMigration } from './002_exchanges';
import { strategyTypesMigration } from './003_strategy_types';
import { seedMexcExchangeMigration } from './004_seed_mexc_exchange';

export const migrations: Migration[] = [
  initialMigration,
  exchangesMigration,
  strategyTypesMigration,
  seedMexcExchangeMigration,
];
