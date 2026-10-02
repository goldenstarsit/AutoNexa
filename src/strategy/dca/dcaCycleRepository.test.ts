import assert from 'node:assert/strict';
import test from 'node:test';
import { SQLiteAdapter } from '../../database/adapters/sqliteAdapter';
import { SQLiteDatabaseModel } from '../../infrastructure/database/sqliteDatabaseModel';
import { DcaCycleRepository } from './dcaCycleRepository';

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

test('cycle state survives repository recreation', () => {
  const db = createDatabase();

  const firstRepository = new DcaCycleRepository(new SQLiteDatabaseModel(db));

  firstRepository.create(
    'dca-btcusdt-cycle-1',
    'dca-btcusdt',
    1,
  );

  firstRepository.setInitialEntryPrice(
    'dca-btcusdt-cycle-1',
    '100',
  );

  firstRepository.setEntryTotals(
    'dca-btcusdt-cycle-1',
    '0.001',
    '0.1',
    '100',
  );

  firstRepository.updateStatus(
    'dca-btcusdt-cycle-1',
    'active',
  );

  const recreatedRepository = new DcaCycleRepository(new SQLiteDatabaseModel(db));
  const recovered = recreatedRepository.getCurrent('dca-btcusdt');

  assert.ok(recovered);
  assert.equal(recovered.id, 'dca-btcusdt-cycle-1');
  assert.equal(recovered.cycleNumber, 1);
  assert.equal(recovered.status, 'active');
  assert.equal(recovered.initialEntryPrice, '100');
  assert.equal(recovered.entryQuantity, '0.001');
  assert.equal(recovered.entryQuoteQuantity, '0.1');
  assert.equal(recovered.averageEntryPrice, '100');

  db.close();
});
