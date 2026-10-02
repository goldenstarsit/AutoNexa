import assert from 'node:assert/strict';
import test from 'node:test';
import type { BalanceModeModel } from '../../domain/balance/balanceModeModel';
import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../domain/exchange/exchangeOrder';
import type { ExecutionModeModel } from '../../domain/execution/executionModeModel';
import type { DcaConfigurationModel, DcaConfigurationOrderModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import { SQLiteAdapter } from '../../database/adapters/sqliteAdapter';
import { SQLiteDatabaseModel } from '../../infrastructure/database/sqliteDatabaseModel';
import { migrations } from '../../database/migrations';
import { runMigrations } from '../../database/migrations/migrationRunner';
import { DcaCycleRepository } from './dcaCycleRepository';
import { DcaCyclePersistenceModelImpl } from './models/dcaCyclePersistenceModel';
import { DcaOrderRepository } from './dcaOrderRepository';
import { DcaRuntimeOrderPersistenceModelImpl } from './models/dcaRuntimeOrderPersistenceModel';
import { DcaRuntimeOrderModelSelectorImpl } from './models/dcaRuntimeOrderModelSelector';
import { DcaExitOrderRepository } from './dcaExitOrderRepository';
import { DcaExitOrderPersistenceModelImpl } from './models/dcaExitOrderPersistenceModel';
import { DcaInitialOrderRepository } from './dcaInitialOrderRepository';
import { DcaInitialOrderPersistenceModelImpl } from './models/dcaInitialOrderPersistenceModel';
import { DcaStrategyService } from './dcaStrategyService';

function createOrder(overrides: Partial<ExchangeOrder> = {}): ExchangeOrder {
  return {
    orderId: 'exchange-order-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    status: 'filled',
    quantity: '0.001',
    executedQuantity: '0.001',
    ...overrides,
  };
}

function createConfiguration(
  exchange: ExchangeModel,
  executionMode: ExecutionModeModel,
): DcaConfigurationModel {
  const balanceMode: BalanceModeModel = {
    id: 'test',
    name: 'Test',
    enabled: true,
    source: {
      getAccount: async () => ({ balances: [] }),
    },
  };

  const strategy = {
    id: 'dca',
    strategyTypeId: 'strategy-type-dca',
    name: 'DCA',
    enabled: true,
    instances: {
      get: () => undefined,
      getAll: () => [],
    },
  };

  return {
    id: 'dca-btcusdt',
    strategyTypeId: 'strategy-type-dca',
    name: 'BTC DCA E2E',
    balanceModeId: balanceMode.id,
    exchangeId: 'mexc',
    executionModeId: executionMode.id,
    balanceMode,
    exchange,
    executionMode,
    symbol: 'BTCUSDT',
    takeProfitPercent: '1',
    stopLossPercent: '50',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orders: [
      {
        id: 'dca-order-1',
        dcaOrderId: 'dca-order-1',
        level: 1,
        dropPercent: '5',
      },
    ] as DcaConfigurationOrderModel[],
    strategy,
  } as DcaConfigurationModel;
}

test('DCA E2E persists cycle, initial order, and DCA order through real SQLite repositories', async () => {
  const db = new SQLiteAdapter(':memory:');
  runMigrations(db, migrations);

  let currentPrice = '100';
  let placeOrderCount = 0;

  const exchange: ExchangeModel = {
    id: 'mexc',
    name: 'MEXC',
    enabled: true,
    balanceModes: {
      get: () => ({
        id: 'test',
        name: 'Test',
        enabled: true,
        source: { getAccount: async () => ({ balances: [] }) },
      }),
    },
    getAccount: async () => ({ balances: [] }),
    depositTestBalance: () => {},
    withdrawTestBalance: () => {},
    getTradingRules: async () => ({
      symbol: 'BTCUSDT',
      status: '1',
      orderTypes: ['MARKET', 'LIMIT'],
      spotTradingAllowed: true,
      marginTradingAllowed: false,
      baseAssetPrecision: 6,
      quotePrecision: 8,
      quoteAssetPrecision: 8,
      baseCommissionPrecision: 8,
      quoteCommissionPrecision: 8,
      quoteAmountPrecision: '1',
      baseSizePrecision: '0.001',
      maxQuoteAmount: '2000000',
      quoteAmountPrecisionMarket: '1',
      maxQuoteAmountMarket: '2000000',
    }),
    getCurrentPrice: async () => currentPrice,
    getBestBidPrice: async () => currentPrice,
    getBestAskPrice: async () => currentPrice,
    placeOrder: async (request: ExchangeOrderRequest) => {
      placeOrderCount += 1;
      return createOrder({
        orderId: `exchange-order-${placeOrderCount}`,
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        quantity: request.quantity,
        price: request.price,
        status: 'filled',
        executedQuantity: request.quantity,
      });
    },
    getOrder: async (_symbol, orderId) =>
      createOrder({
        orderId,
        status: 'filled',
        side: orderId.includes('2') ? 'buy' : 'buy',
        executedQuantity: '0.001',
      }),
    getOrderTrades: async (_symbol, orderId) => [
      {
        tradeId: `trade-${orderId}`,
        orderId,
        symbol: 'BTCUSDT',
        side: 'buy',
        price: orderId.includes('2') ? '94' : '100',
        quantity: '0.001',
        quoteQuantity: orderId.includes('2') ? '0.094' : '0.1',
        timestamp: Date.now(),
      },
    ],
  } as ExchangeModel;

  const executionMode: ExecutionModeModel = {
    id: 'takerOnly',
    name: 'Taker Only',
    enabled: true,
    execute: async <T>(operation: {
      maker: () => Promise<T>;
      taker: () => Promise<T>;
    }) => operation.taker(),
  } as ExecutionModeModel;

  const configuration = createConfiguration(exchange, executionMode);

  const cycleRepository = new DcaCycleRepository(new SQLiteDatabaseModel(db));
  const orderRepository = new DcaOrderRepository(new SQLiteDatabaseModel(db));
  const exitOrderRepository = new DcaExitOrderRepository(new SQLiteDatabaseModel(db));
  const initialOrderRepository = new DcaInitialOrderRepository(new SQLiteDatabaseModel(db));

  const service = new DcaStrategyService(
    new DcaCyclePersistenceModelImpl(cycleRepository),
    new DcaRuntimeOrderPersistenceModelImpl(orderRepository),
    new DcaExitOrderPersistenceModelImpl(exitOrderRepository),
    new DcaInitialOrderPersistenceModelImpl(initialOrderRepository),
    new DcaRuntimeOrderModelSelectorImpl(orderRepository),
    (id) => (id === configuration.id ? configuration : undefined),
  );

  const started = await service.start(configuration.id);

  assert.equal(started.cycleNumber, 1);
  assert.equal(started.initialOrder.order.status, 'filled');
  assert.equal(placeOrderCount, 1);

  const cycle = cycleRepository.getCurrent(configuration.id);
  assert.ok(cycle);
  assert.equal(cycle.status, 'active');
  assert.equal(cycle.initialEntryPrice, '100');

  const persistedInitial = initialOrderRepository.getByCycle(cycle.id);
  assert.ok(persistedInitial);
  assert.equal(persistedInitial.status, 'filled');

  currentPrice = '94';

  const processed = await service.process(configuration.id);

  assert.deepEqual(processed.executedDcaLevels, [1]);
  assert.equal(placeOrderCount, 2);

  const persistedDca = orderRepository.getByCycleAndLevel(cycle.id, 1);
  assert.ok(persistedDca);
  assert.equal(persistedDca.status, 'filled');
  assert.equal(persistedDca.executedQuantity, '0.011');

  db.close();
});
