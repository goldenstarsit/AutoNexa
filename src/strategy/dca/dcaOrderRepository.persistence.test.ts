import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../domain/exchange/exchangeOrder';
import { SQLiteAdapter } from '../../database/adapters/sqliteAdapter';
import { SQLiteDatabaseModel } from '../../infrastructure/database/sqliteDatabaseModel';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import { DcaOrderRepository } from './dcaOrderRepository';
import { DcaInitialOrderRepository } from './dcaInitialOrderRepository';
import { DcaExitOrderRepository } from './dcaExitOrderRepository';

test('DCA runtime order survives repository recreation', () => {
  const db = new SQLiteAdapter(':memory:');

  db.exec(`
    CREATE TABLE dca_runtime_orders (
      id TEXT PRIMARY KEY,
      dca_configuration_id TEXT NOT NULL,
      dca_cycle_id TEXT NOT NULL,
      dca_order_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      exchange_order_id TEXT NOT NULL,
      client_order_id TEXT,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      execution_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      quantity TEXT NOT NULL,
      executed_quantity TEXT NOT NULL,
      requested_price TEXT,
      average_fill_price TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (dca_cycle_id, level)
    )
  `);

  db.exec(`
    CREATE TABLE dca_runtime_order_fills (
      id TEXT PRIMARY KEY,
      dca_runtime_order_id TEXT NOT NULL,
      exchange_trade_id TEXT NOT NULL,
      exchange_order_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      price TEXT NOT NULL,
      quantity TEXT NOT NULL,
      quote_quantity TEXT NOT NULL,
      trade_timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (dca_runtime_order_id, exchange_trade_id)
    )
  `);

  const firstRepository = new DcaOrderRepository(new SQLiteDatabaseModel(db));

  const order: ExchangeOrder = {
    orderId: 'exchange-order-1',
    clientOrderId: 'client-order-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'limit',
    status: 'open',
    quantity: '0.001',
    executedQuantity: '0',
    price: '100',
  };

  const request: ExchangeOrderRequest = {
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'limit',
    quantity: '0.001',
    price: '100',
    executionMode: 'makerOnly',
  };

  firstRepository.saveOrder(
    'config-1',
    'cycle-1',
    'dca-order-1',
    1,
    order,
    request,
  );

  const recreatedRepository = new DcaOrderRepository(new SQLiteDatabaseModel(db));
  const recovered = recreatedRepository.getByCycleAndLevel('cycle-1', 1);

  assert.ok(recovered);
  assert.equal(recovered.id, 'cycle-1-dca-order-1');
  assert.equal(recovered.dcaConfigurationId, 'config-1');
  assert.equal(recovered.dcaCycleId, 'cycle-1');
  assert.equal(recovered.dcaOrderId, 'dca-order-1');
  assert.equal(recovered.level, 1);
  assert.equal(recovered.exchangeOrderId, 'exchange-order-1');
  assert.equal(recovered.clientOrderId, 'client-order-1');
  assert.equal(recovered.symbol, 'BTCUSDT');
  assert.equal(recovered.status, 'open');
  assert.equal(recovered.quantity, '0.001');
  assert.equal(recovered.executedQuantity, '0');
  assert.equal(recovered.requestedPrice, '100');
  assert.equal(recovered.executionMode, 'makerOnly');
});

test('DCA runtime order fills survive repository recreation', () => {
  const db = new SQLiteAdapter(':memory:');

  db.exec(`
    CREATE TABLE dca_runtime_orders (
      id TEXT PRIMARY KEY,
      dca_configuration_id TEXT NOT NULL,
      dca_cycle_id TEXT NOT NULL,
      dca_order_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      exchange_order_id TEXT NOT NULL,
      client_order_id TEXT,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      execution_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      quantity TEXT NOT NULL,
      executed_quantity TEXT NOT NULL,
      requested_price TEXT,
      average_fill_price TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (dca_cycle_id, level)
    )
  `);

  db.exec(`
    CREATE TABLE dca_runtime_order_fills (
      id TEXT PRIMARY KEY,
      dca_runtime_order_id TEXT NOT NULL,
      exchange_trade_id TEXT NOT NULL,
      exchange_order_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      price TEXT NOT NULL,
      quantity TEXT NOT NULL,
      quote_quantity TEXT NOT NULL,
      trade_timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (dca_runtime_order_id, exchange_trade_id)
    )
  `);

  const repository = new DcaOrderRepository(new SQLiteDatabaseModel(db));

  const order: ExchangeOrder = {
    orderId: 'exchange-order-2',
    clientOrderId: 'client-order-2',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'limit',
    status: 'filled',
    quantity: '0.001',
    executedQuantity: '0.001',
    price: '100',
  };

  const request: ExchangeOrderRequest = {
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'limit',
    quantity: '0.001',
    price: '100',
    executionMode: 'makerOnly',
  };

  const savedOrder = repository.saveOrder(
    'config-1',
    'cycle-1',
    'dca-order-2',
    1,
    order,
    request,
  );

  const trade: ExchangeTrade = {
    tradeId: 'trade-1',
    orderId: 'exchange-order-2',
    symbol: 'BTCUSDT',
    side: 'buy',
    price: '100',
    quantity: '0.001',
    quoteQuantity: '0.1',
    timestamp: 1750000000000,
  };

  repository.saveFills(savedOrder.id, [trade]);

  const recreatedRepository = new DcaOrderRepository(new SQLiteDatabaseModel(db));
  const recovered = recreatedRepository.getByCycleAndLevel('cycle-1', 1);

  assert.ok(recovered);
  assert.equal(recovered.fills.length, 1);
  assert.equal(recovered.fills[0]?.id, 'cycle-1-dca-order-1-fill-trade-1');
  assert.equal(recovered.fills[0]?.dcaRuntimeOrderId, savedOrder.id);
  assert.equal(recovered.fills[0]?.exchangeTradeId, 'trade-1');
  assert.equal(recovered.fills[0]?.exchangeOrderId, 'exchange-order-2');
  assert.equal(recovered.fills[0]?.symbol, 'BTCUSDT');
  assert.equal(recovered.fills[0]?.side, 'buy');
  assert.equal(recovered.fills[0]?.price, '100');
  assert.equal(recovered.fills[0]?.quantity, '0.001');
  assert.equal(recovered.fills[0]?.quoteQuantity, '0.1');
  assert.equal(recovered.fills[0]?.tradeTimestamp, 1750000000000);
});

test('initial and exit orders survive repository recreation', () => {
  const db = new SQLiteAdapter(':memory:');

  db.exec(`
    CREATE TABLE dca_initial_orders (
      id TEXT PRIMARY KEY,
      dca_configuration_id TEXT NOT NULL,
      dca_cycle_id TEXT NOT NULL,
      exchange_order_id TEXT NOT NULL,
      client_order_id TEXT,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      execution_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      quantity TEXT NOT NULL,
      executed_quantity TEXT NOT NULL,
      requested_price TEXT,
      average_fill_price TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (dca_cycle_id)
    )
  `);

  db.exec(`
    CREATE TABLE dca_initial_order_fills (
      id TEXT PRIMARY KEY,
      dca_initial_order_id TEXT NOT NULL,
      exchange_trade_id TEXT NOT NULL,
      exchange_order_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      price TEXT NOT NULL,
      quantity TEXT NOT NULL,
      quote_quantity TEXT NOT NULL,
      trade_timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (dca_initial_order_id, exchange_trade_id)
    )
  `);

  db.exec(`
    CREATE TABLE dca_exit_orders (
      id TEXT PRIMARY KEY,
      dca_configuration_id TEXT NOT NULL,
      dca_cycle_id TEXT NOT NULL,
      exit_type TEXT NOT NULL,
      exchange_order_id TEXT NOT NULL,
      client_order_id TEXT,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      execution_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      quantity TEXT NOT NULL,
      executed_quantity TEXT NOT NULL,
      requested_price TEXT,
      average_fill_price TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (dca_cycle_id, exit_type)
    )
  `);

  db.exec(`
    CREATE TABLE dca_exit_order_fills (
      id TEXT PRIMARY KEY,
      dca_exit_order_id TEXT NOT NULL,
      exchange_trade_id TEXT NOT NULL,
      exchange_order_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      price TEXT NOT NULL,
      quantity TEXT NOT NULL,
      quote_quantity TEXT NOT NULL,
      trade_timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (dca_exit_order_id, exchange_trade_id)
    )
  `);

  const initialRepository = new DcaInitialOrderRepository(new SQLiteDatabaseModel(db));
  const exitRepository = new DcaExitOrderRepository(new SQLiteDatabaseModel(db));

  const initialOrder: ExchangeOrder = {
    orderId: 'initial-exchange-order',
    clientOrderId: 'initial-client-order',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    status: 'filled',
    quantity: '0.001',
    executedQuantity: '0.001',
  };

  const exitOrder: ExchangeOrder = {
    orderId: 'take-profit-exchange-order',
    clientOrderId: 'take-profit-client-order',
    symbol: 'BTCUSDT',
    side: 'sell',
    type: 'market',
    status: 'filled',
    quantity: '0.001',
    executedQuantity: '0.001',
  };

  const marketRequest: ExchangeOrderRequest = {
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    quantity: '0.001',
    executionMode: 'takerOnly',
  };

  const exitRequest: ExchangeOrderRequest = {
    symbol: 'BTCUSDT',
    side: 'sell',
    type: 'market',
    quantity: '0.001',
    executionMode: 'takerOnly',
  };

  const savedInitial = initialRepository.saveOrder(
    'config-1',
    'cycle-1',
    initialOrder,
    marketRequest,
  );

  initialRepository.saveFills(savedInitial.id, [
    {
      tradeId: 'initial-trade-1',
      orderId: 'initial-exchange-order',
      symbol: 'BTCUSDT',
      side: 'buy',
      price: '100',
      quantity: '0.001',
      quoteQuantity: '0.1',
      timestamp: 1750000000000,
    },
  ]);

  const savedExit = exitRepository.saveOrder(
    'config-1',
    'cycle-1',
    'takeProfit',
    exitOrder,
    exitRequest,
  );

  exitRepository.saveFills(savedExit.id, [
    {
      tradeId: 'take-profit-trade-1',
      orderId: 'take-profit-exchange-order',
      symbol: 'BTCUSDT',
      side: 'sell',
      price: '101',
      quantity: '0.001',
      quoteQuantity: '0.101',
      timestamp: 1750000060000,
    },
  ]);

  const recreatedInitialRepository = new DcaInitialOrderRepository(new SQLiteDatabaseModel(db));
  const recreatedExitRepository = new DcaExitOrderRepository(new SQLiteDatabaseModel(db));

  const recoveredInitial = recreatedInitialRepository.getByCycle('cycle-1');
  const recoveredExit = recreatedExitRepository.getByCycleAndType(
    'cycle-1',
    'takeProfit',
  );

  assert.ok(recoveredInitial);
  assert.equal(recoveredInitial.id, savedInitial.id);
  assert.equal(recoveredInitial.dcaConfigurationId, 'config-1');
  assert.equal(recoveredInitial.dcaCycleId, 'cycle-1');
  assert.equal(recoveredInitial.exchangeOrderId, 'initial-exchange-order');
  assert.equal(recoveredInitial.status, 'filled');
  assert.equal(recoveredInitial.quantity, '0.001');
  assert.equal(recoveredInitial.executedQuantity, '0.001');
  assert.equal(recoveredInitial.fills.length, 1);
  assert.equal(recoveredInitial.fills[0]?.exchangeTradeId, 'initial-trade-1');
  assert.equal(recoveredInitial.fills[0]?.price, '100');

  assert.ok(recoveredExit);
  assert.equal(recoveredExit.id, savedExit.id);
  assert.equal(recoveredExit.dcaConfigurationId, 'config-1');
  assert.equal(recoveredExit.dcaCycleId, 'cycle-1');
  assert.equal(recoveredExit.exitType, 'takeProfit');
  assert.equal(recoveredExit.exchangeOrderId, 'take-profit-exchange-order');
  assert.equal(recoveredExit.status, 'filled');
  assert.equal(recoveredExit.quantity, '0.001');
  assert.equal(recoveredExit.executedQuantity, '0.001');
  assert.equal(recoveredExit.fills.length, 1);
  assert.equal(recoveredExit.fills[0]?.exchangeTradeId, 'take-profit-trade-1');
  assert.equal(recoveredExit.fills[0]?.price, '101');
});
