import type { Migration } from './migrationRunner';

export const initialMigration: Migration = {
  version: 1,
  name: 'initial',
  up: () => {
    // Reserved for the first application schema.
  },
};
