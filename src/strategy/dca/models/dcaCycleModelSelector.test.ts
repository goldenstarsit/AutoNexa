import assert from 'node:assert/strict';
import test from 'node:test';

import { SQLiteAdapter } from '../../../database/adapters/sqliteAdapter';
import { SQLiteDatabaseModel } from '../../../infrastructure/database/sqliteDatabaseModel';
import { DcaCycleRepository } from '../dcaCycleRepository';
import { DcaCyclePersistenceModelImpl } from './dcaCyclePersistenceModel';
import { DcaCycleModelSelector } from './dcaCycleModelSelector';

function createDatabase() {
  const db = new SQLiteAdapter(':memory:');

  db.exec(`
    CREATE TABLE dca_cycles (
      id TEXT PRIMARY KEY,
      dca_configuration_id TEXT NOT NULL,
      cycle_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      initial_entry_price TEXT,
      entry_quantity TEXT,
      entry_quote_quantity TEXT,
      average_entry_price TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (dca_configuration_id, cycle_number)
    )
  `);

  return db;
}

test('start refuses to create a second cycle while an active cycle exists', () => {
  const db = createDatabase();
  const repository = new DcaCycleRepository(new SQLiteDatabaseModel(db));
  const persistence = new DcaCyclePersistenceModelImpl(repository);
  const selector = new DcaCycleModelSelector(persistence);

  selector.start('dca-ethusdt');
  const active = repository.setInitialEntryPrice(
    'dca-ethusdt-cycle-1',
    '2700',
  );

  assert.equal(active.status, 'active');

  assert.throws(
    () => selector.start('dca-ethusdt'),
    /already has a non-terminal cycle/,
  );

  assert.equal(
    repository.getCurrent('dca-ethusdt')?.cycleNumber,
    1,
  );

  db.close();
});

test('start refuses to create a second cycle while a pending cycle exists', () => {
  const db = createDatabase();
  const repository = new DcaCycleRepository(new SQLiteDatabaseModel(db));
  const persistence = new DcaCyclePersistenceModelImpl(repository);
  const selector = new DcaCycleModelSelector(persistence);

  selector.start('dca-btcusdt');

  assert.throws(
    () => selector.start('dca-btcusdt'),
    /already has a non-terminal cycle/,
  );

  assert.equal(
    repository.getCurrent('dca-btcusdt')?.cycleNumber,
    1,
  );

  db.close();
});

test('start creates the next cycle after the previous cycle is terminal', () => {
  const db = createDatabase();
  const repository = new DcaCycleRepository(new SQLiteDatabaseModel(db));
  const persistence = new DcaCyclePersistenceModelImpl(repository);
  const selector = new DcaCycleModelSelector(persistence);

  const first = selector.start('dca-solusdt');
  first.complete();

  const second = selector.start('dca-solusdt');

  assert.equal(second.cycleNumber, 2);
  assert.equal(second.status, 'pending');

  db.close();
});
