import type { Migration } from './migrationRunner';
import { initialMigration } from './001_initial';
import { exchangesMigration } from './002_exchanges';
import { strategyTypesMigration } from './003_strategy_types';
import { seedMexcExchangeMigration } from './004_seed_mexc_exchange';
import { executionModesMigration } from './005_execution_modes';
import { balanceModesMigration } from './006_balance_modes';
import { testBalancesMigration } from './007_test_balances';
import { dcaConfigurationsMigration } from './008_dca_configurations';
import { dcaCyclesMigration } from './009_dca_cycles';
import { dcaRuntimeOrdersMigration } from './010_dca_runtime_orders';
import { dcaCycleEntryTotalsMigration } from './011_dca_cycle_entry_totals';
import { testOrdersMigration } from './012_test_orders';
import { dcaExitOrdersMigration } from './013_dca_exit_orders';
import { dcaInitialOrdersMigration } from './014_dca_initial_orders';
import { testMarketPricesMigration } from './015_test_market_prices';

export const migrations: Migration[] = [
  initialMigration,
  exchangesMigration,
  strategyTypesMigration,
  seedMexcExchangeMigration,
  executionModesMigration,
  balanceModesMigration,
  testBalancesMigration,
  dcaConfigurationsMigration,
  dcaCyclesMigration,
  dcaRuntimeOrdersMigration,
  dcaCycleEntryTotalsMigration,
  testOrdersMigration,
  dcaExitOrdersMigration,
  dcaInitialOrdersMigration,
  testMarketPricesMigration,
];
