import type { Migration } from './migrationRunner';
import { initialMigration } from './001_initial';
import { exchangesMigration } from './002_exchanges';
import { strategyTypesMigration } from './003_strategy_types';
import { seedMexcExchangeMigration } from './004_seed_mexc_exchange';
import { executionModesMigration } from './005_execution_modes';
import { balanceModesMigration } from './006_balance_modes';
import { testBalancesMigration } from './007_test_balances';
import { dcaConfigurationsMigration } from './008_dca_configurations';

export const migrations: Migration[] = [
  initialMigration,
  exchangesMigration,
  strategyTypesMigration,
  seedMexcExchangeMigration,
  executionModesMigration,
  balanceModesMigration,
  testBalancesMigration,
  dcaConfigurationsMigration,
];
