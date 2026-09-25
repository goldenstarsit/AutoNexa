import type { Migration } from './migrationRunner';
import { initialMigration } from './001_initial';
import { exchangesMigration } from './002_exchanges';

export const migrations: Migration[] = [
  initialMigration,
  exchangesMigration,
];
