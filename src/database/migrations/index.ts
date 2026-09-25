import type { Migration } from './migrationRunner';
import { initialMigration } from './001_initial';

export const migrations: Migration[] = [initialMigration];
