import assert from 'node:assert/strict';
import test from 'node:test';

import type { BalanceModeModel } from '../../domain/balance/balanceModeModel';
import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type { ExecutionModeModel } from '../../domain/execution/executionModeModel';
import type {
  DcaConfigurationModel,
  DcaConfigurationOrderModel,
} from '../../domain/strategy/dca/dcaConfigurationModel';
import type {
  DcaCyclePersistenceModel,
  DcaCycleModelRecord,
} from '../../domain/strategy/dca/dcaCycleModel';
import type {
  DcaInitialOrderPersistenceModel,
  DcaInitialOrderRecord,
  DcaInitialOrderModel,
} from '../../domain/strategy/dca/dcaInitialOrderModel';
import type {
  DcaRuntimeOrderPersistenceModel,
  DcaRuntimeOrderRecord,
  DcaRuntimeOrderModel,
} from '../../domain/strategy/dca/dcaRuntimeOrderModel';
import type {
  DcaExitOrderPersistenceModel,
  DcaExitOrderRecord,
  DcaExitOrderModel,
  DcaExitOrderFillRecord,
  DcaExitType,
} from '../../domain/strategy/dca/dcaExitOrderModel';
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

function createTrade(overrides: Partial<ExchangeTrade> = {}): ExchangeTrade {
  return {
    tradeId: 'trade-1',
    orderId: 'exchange-order-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    price: '100',
    quantity: '0.001',
    quoteQuantity: '0.1',
    timestamp: Date.now(),
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
      getAccount: async () => ({
        balances: [],
      }),
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
    id: 'configuration-1',
    strategyTypeId: 'strategy-type-dca',
    name: 'BTC DCA',
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
    orders: [],
    strategy,
  } as DcaConfigurationModel;
}

function balanceModeForExchange(): BalanceModeModel {
  return {
    id: 'test',
    name: 'Test',
    enabled: true,
    source: {
      getAccount: async () => ({
        balances: [],
      }),
    },
  };
}

test('start creates cycle 1 and executes the initial order', async () => {
  const cycles = new Map<string, DcaCycleModelRecord>();
  const initialOrders = new Map<string, DcaInitialOrderModel>();

  let createCount = 0;
  let placeOrderCount = 0;

  const exchange: ExchangeModel = {
    id: 'mexc',
    name: 'MEXC',
    enabled: true,
    balanceModes: {
      get: () => balanceModeForExchange(),
    },
    getAccount: async () => ({ balances: [] }),
    depositTestBalance: () => {},
    withdrawTestBalance: () => {},
    getTradingRules: async () => ({
      symbol: 'BTCUSDT',
      status: '1',
      orderTypes: ['LIMIT', 'MARKET'],
      spotTradingAllowed: true,
      marginTradingAllowed: false,
      baseAssetPrecision: 3,
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
    getCurrentPrice: async () => '100',
    getBestBidPrice: async () => '99.9',
    getBestAskPrice: async () => '100.1',
    placeOrder: async (request: ExchangeOrderRequest) => {
      placeOrderCount += 1;
      return createOrder({
        orderId: 'exchange-initial-1',
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        quantity: request.quantity,
        price: request.price,
      });
    },
    getOrder: async (_symbol: string, _orderId: string) => createOrder({
      orderId: 'exchange-initial-1',
    }),
    getOrderTrades: async (_symbol: string, _orderId: string) => [createTrade({
      orderId: 'exchange-initial-1',
    })],
  } as ExchangeModel;

  const executionMode: ExecutionModeModel = {
    id: 'takerOnly',
    name: 'Taker Only',
    enabled: true,
    execute: async <T>(operation: { maker: () => Promise<T>; taker: () => Promise<T> }) =>
      operation.taker(),
  } as ExecutionModeModel;

  const configuration = createConfiguration(exchange, executionMode);

    const cyclePersistence: DcaCyclePersistenceModel = {
      getById: (id) => cycles.get(id),

      getCurrent: (configurationId) =>
        [...cycles.values()]
          .filter((cycle) => cycle.dcaConfigurationId === configurationId)
          .sort((a, b) => b.cycleNumber - a.cycleNumber)[0],

      create: (id, dcaConfigurationId, cycleNumber, createdAt) => {
        createCount += 1;

        const now = createdAt ?? new Date().toISOString();
        const cycle: DcaCycleModelRecord = {
          id,
          dcaConfigurationId,
          cycleNumber,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };

        cycles.set(cycle.id, cycle);
        return cycle;
      },

      setInitialEntryPrice: (id, initialEntryPrice) => {
        const cycle = cycles.get(id);
        if (!cycle) throw new Error(`missing cycle: ${id}`);

        const updated: DcaCycleModelRecord = {
          ...cycle,
          status: 'active',
          initialEntryPrice,
          updatedAt: new Date().toISOString(),
        };

        cycles.set(id, updated);
        return updated;
      },

      setEntryTotals: (id, quantity, quoteQuantity, averageEntryPrice) => {
        const cycle = cycles.get(id);
        if (!cycle) throw new Error(`missing cycle: ${id}`);

        const updated = {
          ...cycle,
          entryQuantity: quantity,
          entryQuoteQuantity: quoteQuantity,
          averageEntryPrice,
        };

        cycles.set(id, updated);
        return updated;
      },

      updateStatus: (id, status) => {
        const cycle = cycles.get(id);
        if (!cycle) throw new Error(`missing cycle: ${id}`);

        const updated = { ...cycle, status };
        cycles.set(id, updated);
        return updated;
      },
    };

  const initialOrderPersistence: DcaInitialOrderPersistenceModel = {
    getByCycle: (cycleId) => {
      return [...initialOrders.values()].find((order) => order.dcaCycleId === cycleId);
    },
    saveOrder: (configurationId, cycleId, order, request) => {
      const now = new Date().toISOString();
      const record = {
        id: `${cycleId}-initial-order`,
        dcaConfigurationId: configurationId,
        dcaCycleId: cycleId,
        exchangeOrderId: order.orderId,
        clientOrderId: order.clientOrderId,
        executionMode: request.executionMode,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: order.status,
        quantity: order.quantity,
        executedQuantity: order.executedQuantity,
        requestedPrice: order.price ?? request.price,
        averageFillPrice: undefined,
        createdAt: now,
        updatedAt: now,
        fills: [],
      } satisfies DcaInitialOrderModel;
      initialOrders.set(record.id, record);
      return record;
    },
    getFills: () => [],
    saveFills: () => [],
    updateOrder: (id, order) => {
      const existing = initialOrders.get(id);
      if (!existing) throw new Error(`missing initial order: ${id}`);

      const updated = {
        ...existing,
        status: order.status,
        executedQuantity: order.executedQuantity,
        updatedAt: new Date().toISOString(),
        };

      initialOrders.set(id, updated);
      return updated;
    },
  };

  const runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel = {
    getByCycleAndLevel: () => undefined,
    getFillsByCycle: () => [],
    getFills: () => [],
    saveOrder: (configurationId, cycleId, dcaOrderId, level, order, request) => ({
      ...(order as any),
      id: `${cycleId}-runtime-${level}`,
      dcaConfigurationId: configurationId,
      dcaCycleId: cycleId,
      dcaOrderId,
      level,
      fills: [],
    }) as DcaRuntimeOrderModel,
    updateOrder: (id, order) => ({ ...(order as any), id, fills: [] }) as DcaRuntimeOrderModel,
    saveFills: () => [],
  };

  const exitOrderPersistence: DcaExitOrderPersistenceModel = {
    getByCycleAndType: () => undefined,
    saveOrder: (configurationId, cycleId, exitType, order, request) => ({
      ...(order as any),
      id: `${cycleId}-${exitType}`,
      dcaConfigurationId: configurationId,
      dcaCycleId: cycleId,
      exitType,
      fills: [],
    }) as DcaExitOrderModel,
    updateOrder: (id, order) => ({ ...(order as any), id, fills: [] }) as DcaExitOrderModel,
    getFills: () => [],
    saveFills: () => [],
  };

  const service = new DcaStrategyService(
    cyclePersistence,
    runtimeOrderPersistence,
    exitOrderPersistence,
    initialOrderPersistence,
    {
      getByCycleAndLevel: () => undefined,
      getFillsByCycle: () => [],
      getFills: () => [],
    },
    (id) => (id === configuration.id ? configuration : undefined),
  );

  const result = await service.start(configuration.id);

  assert.equal(createCount, 1);
  assert.equal(placeOrderCount, 1);
  assert.equal(result.cycleId, `${configuration.id}-cycle-1`);
  assert.equal(result.cycleNumber, 1);
  assert.equal(result.initialOrder.order.status, 'filled');

  const cycle = cycles.get(`${configuration.id}-cycle-1`);
  assert.ok(cycle);
  assert.equal(cycle.status, 'active');
  assert.equal(cycle.initialEntryPrice, '100');
  assert.equal(cycle.entryQuantity, '0.001');
  assert.equal(cycle.entryQuoteQuantity, '0.1');
});

test('process reconciles a pending initial order before evaluating the active cycle', async () => {
  const cycles = new Map<string, DcaCycleModelRecord>();
  const initialOrders = new Map<string, DcaInitialOrderModel>();

  const configurationId = 'configuration-1';
  const cycleId = `${configurationId}-cycle-1`;

  let getOrderCalls = 0;
  let getOrderTradesCalls = 0;
  let currentPriceCalls = 0;

  const exchange: ExchangeModel = {
    id: 'mexc',
    name: 'MEXC',
    enabled: true,
    balanceModes: {
      get: () => balanceModeForExchange(),
    },
    getAccount: async () => ({ balances: [] }),
    depositTestBalance: () => {},
    withdrawTestBalance: () => {},
    getTradingRules: async () => ({
      symbol: 'BTCUSDT',
      status: '1',
      orderTypes: ['LIMIT', 'MARKET'],
      spotTradingAllowed: true,
      marginTradingAllowed: false,
      baseAssetPrecision: 3,
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
    getCurrentPrice: async () => {
      currentPriceCalls += 1;
      return '100';
    },
    getBestBidPrice: async () => '99.9',
    getBestAskPrice: async () => '100.1',
    placeOrder: async (request: ExchangeOrderRequest) =>
      createOrder({
        orderId: 'exchange-initial-1',
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        quantity: request.quantity,
        price: request.price,
        status: 'open',
        executedQuantity: '0',
      }),
    getOrder: async () => {
      getOrderCalls += 1;
      return createOrder({
        orderId: 'exchange-initial-1',
        status: 'filled',
        executedQuantity: '0.001',
      });
    },
    getOrderTrades: async () => {
      getOrderTradesCalls += 1;
      return [
        createTrade({
          tradeId: 'trade-pending-1',
          orderId: 'exchange-initial-1',
          price: '100',
          quantity: '0.001',
          quoteQuantity: '0.1',
        }),
      ];
    },
  } as ExchangeModel;

  const executionMode: ExecutionModeModel = {
    id: 'takerOnly',
    name: 'Taker Only',
    enabled: true,
    execute: async <T>(operation: { maker: () => Promise<T>; taker: () => Promise<T> }) =>
      operation.taker(),
  } as ExecutionModeModel;

  const configuration = {
    ...createConfiguration(exchange, executionMode),
    orders: [
      {
        id: 'dca-order-1',
        dcaOrderId: 'dca-order-1',
        level: 1,
        dropPercent: '5',
      },
    ],
  } as DcaConfigurationModel;

  cycles.set(cycleId, {
    id: cycleId,
    dcaConfigurationId: configurationId,
    cycleNumber: 1,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const cyclePersistence: DcaCyclePersistenceModel = {
    getById: (id) => cycles.get(id),

    getCurrent: (id) =>
      [...cycles.values()]
        .filter((cycle) => cycle.dcaConfigurationId === id)
        .sort((a, b) => b.cycleNumber - a.cycleNumber)[0],

    create: (id, dcaConfigurationId, cycleNumber, createdAt) => {
      const now = createdAt ?? new Date().toISOString();
      const cycle: DcaCycleModelRecord = {
        id,
        dcaConfigurationId,
        cycleNumber,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      cycles.set(id, cycle);
      return cycle;
    },

    setInitialEntryPrice: (id, initialEntryPrice) => {
      const cycle = cycles.get(id);
      if (!cycle) throw new Error(`missing cycle: ${id}`);

      const updated = {
        ...cycle,
        status: 'active' as const,
        initialEntryPrice,
      };

      cycles.set(id, updated);
      return updated;
    },

    setEntryTotals: (id, quantity, quoteQuantity, averageEntryPrice) => {
      const cycle = cycles.get(id);
      if (!cycle) throw new Error(`missing cycle: ${id}`);

      const updated = {
        ...cycle,
        entryQuantity: quantity,
        entryQuoteQuantity: quoteQuantity,
        averageEntryPrice,
      };

      cycles.set(id, updated);
      return updated;
    },

    updateStatus: (id, status) => {
      const cycle = cycles.get(id);
      if (!cycle) throw new Error(`missing cycle: ${id}`);

      const updated = { ...cycle, status };
      cycles.set(id, updated);
      return updated;
    },
  };

  initialOrders.set(`${cycleId}-initial-order`, {
    id: `${cycleId}-initial-order`,
    dcaConfigurationId: configurationId,
    dcaCycleId: cycleId,
    exchangeOrderId: 'exchange-initial-1',
    executionMode: 'makerOnly',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    status: 'open',
    quantity: '0.001',
    executedQuantity: '0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fills: [],
  });

  const initialOrderPersistence: DcaInitialOrderPersistenceModel = {
    getByCycle: (id) =>
      [...initialOrders.values()].find((order) => order.dcaCycleId === id),

    saveOrder: (id, cycle, order, request) => {
      const record = {
        id: `${cycle}-initial-order`,
        dcaConfigurationId: id,
        dcaCycleId: cycle,
        exchangeOrderId: order.orderId,
        clientOrderId: order.clientOrderId,
        executionMode: request.executionMode,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: order.status,
        quantity: order.quantity,
        executedQuantity: order.executedQuantity,
        requestedPrice: order.price ?? request.price,
        averageFillPrice: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fills: [],
      } satisfies DcaInitialOrderModel;

      initialOrders.set(record.id, record);
      return record;
    },

    updateOrder: (id, order) => {
      const existing = initialOrders.get(id);
      if (!existing) throw new Error(`missing initial order: ${id}`);

      const updated = {
        ...existing,
        status: order.status,
        executedQuantity: order.executedQuantity,
      };

      initialOrders.set(id, updated);
      return updated;
    },

    getFills: (id) => initialOrders.get(id)?.fills ?? [],

    saveFills: (id, trades) => {
      const existing = initialOrders.get(id);
      if (!existing) throw new Error(`missing initial order: ${id}`);

      const fills = trades.map((trade) => ({
        id: `${id}-${trade.tradeId}`,
        dcaInitialOrderId: id,
        exchangeTradeId: trade.tradeId,
        exchangeOrderId: trade.orderId,
        symbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        quoteQuantity: trade.quoteQuantity,
        tradeTimestamp: trade.timestamp,
        createdAt: new Date().toISOString(),
      }));

      initialOrders.set(id, { ...existing, fills });
      return fills;
    },
  };

  const runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel = {
    getByCycleAndLevel: () => undefined,
    getFillsByCycle: () => [],
    getFills: () => [],
    saveOrder: (configurationId, cycleId, dcaOrderId, level, order, request) => ({
      ...(order as any),
      id: `${cycleId}-runtime-${level}`,
      dcaConfigurationId: configurationId,
      dcaCycleId: cycleId,
      dcaOrderId,
      level,
      fills: [],
    }) as DcaRuntimeOrderModel,
    updateOrder: (id, order) => ({ ...(order as any), id, fills: [] }) as DcaRuntimeOrderModel,
    saveFills: () => [],
  };

  const exitOrderPersistence: DcaExitOrderPersistenceModel = {
    getByCycleAndType: () => undefined,
    saveOrder: (configurationId, cycleId, exitType, order, request) => ({
      ...(order as any),
      id: `${cycleId}-${exitType}`,
      dcaConfigurationId: configurationId,
      dcaCycleId: cycleId,
      exitType,
      fills: [],
    }) as DcaExitOrderModel,
    updateOrder: (id, order) => ({ ...(order as any), id, fills: [] }) as DcaExitOrderModel,
    getFills: () => [],
    saveFills: () => [],
  };

  const service = new DcaStrategyService(
    cyclePersistence,
    runtimeOrderPersistence,
    exitOrderPersistence,
    initialOrderPersistence,
    {
      getByCycleAndLevel: () => undefined,
      getFillsByCycle: () => [],
      getFills: () => [],
    },
    (id) => (id === configuration.id ? configuration : undefined),
  );

  const result = await service.process(configuration.id);

  assert.equal(getOrderCalls, 1);
  assert.equal(getOrderTradesCalls, 1);
  assert.ok(currentPriceCalls >= 1);
  assert.equal(result.cycleId, cycleId);
  assert.equal(result.cycleNumber, 1);
  assert.equal(result.currentPrice, '100');
  assert.equal(result.initialOrderPending, undefined);
  assert.deepEqual(result.executedDcaLevels, []);
  assert.deepEqual(result.reachedDcaLevels, [
    {
      level: 1,
      dcaOrderId: 'dca-order-1',
      dropPercent: '5',
      triggerPrice: '95',
      reached: false,
    },
  ]);

  const cycle = cycles.get(cycleId);
  assert.ok(cycle);
  assert.equal(cycle.status, 'active');
  assert.equal(cycle.initialEntryPrice, '100');
});

test('process executes a reached DCA level and records the executed level', async () => {
  const executionMode: ExecutionModeModel = {
    id: 'takerOnly',
    name: 'Taker Only',
    enabled: true,
    execute: async <T>(operation: { maker: () => Promise<T>; taker: () => Promise<T> }) =>
      operation.taker(),
  };

  let currentPriceCalls = 0;
  let placeOrderCalls = 0;
  let savedRuntimeOrder: DcaRuntimeOrderModel | undefined;

  const exchange: ExchangeModel = {
    id: 'mexc',
    name: 'MEXC',
    enabled: true,
    balanceModes: {
      get: () => balanceModeForExchange(),
    },
    getAccount: async () => ({ balances: [] }),
    depositTestBalance: () => {},
    withdrawTestBalance: () => {},
    getTradingRules: async () => ({
      symbol: 'BTCUSDT',
      status: '1',
      orderTypes: ['MARKET'],
      spotTradingAllowed: true,
      marginTradingAllowed: false,
      baseAssetPrecision: 6,
      quotePrecision: 2,
      quoteAssetPrecision: 2,
      baseCommissionPrecision: 6,
      quoteCommissionPrecision: 2,
      quoteAmountPrecision: '1',
      baseSizePrecision: '0.001',
      maxQuoteAmount: '2000000',
      quoteAmountPrecisionMarket: '1',
      maxQuoteAmountMarket: '2000000',
    }),
    getCurrentPrice: async () => {
      currentPriceCalls += 1;
      return '94';
    },
    getBestBidPrice: async () => '93.9',
    getBestAskPrice: async () => '94.1',
    placeOrder: async () => {
      placeOrderCalls += 1;
      return createOrder({
        orderId: 'exchange-dca-1',
        status: 'filled',
        quantity: '0.001',
        executedQuantity: '0.001',
      });
    },
    getOrder: async () =>
      createOrder({
        orderId: 'exchange-dca-1',
        status: 'filled',
        quantity: '0.001',
        executedQuantity: '0.001',
      }),
    getOrderTrades: async () => [
      createTrade({
        tradeId: 'dca-trade-1',
        orderId: 'exchange-dca-1',
        price: '94',
        quantity: '0.001',
        quoteQuantity: '0.094',
      }),
    ],
  };

  const configuration = {
    ...createConfiguration(exchange, executionMode),
    orders: [
      {
        id: 'dca-order-1',
        dcaOrderId: 'dca-order-1',
        level: 1,
        dropPercent: '5',
      },
    ] as DcaConfigurationOrderModel[],
  } as DcaConfigurationModel;

  const cycle: DcaCycleModelRecord = {
    id: 'configuration-1-cycle-1',
    dcaConfigurationId: configuration.id,
    cycleNumber: 1,
    status: 'active',
    initialEntryPrice: '100',
    entryQuantity: '0.001',
    entryQuoteQuantity: '0.1',
    averageEntryPrice: '100',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const cycles = new Map<string, DcaCycleModelRecord>([[cycle.id, cycle]]);
  let runtimeOrderId = 0;

  const cyclePersistence: DcaCyclePersistenceModel = {
    getById: (id) => cycles.get(id),
    getCurrent: (configurationId) =>
      [...cycles.values()].find(
        (item) =>
          item.dcaConfigurationId === configurationId &&
          (item.status === 'active' || item.status === 'pending'),
      ),
    create: (id, dcaConfigurationId, cycleNumber) => {
      const created: DcaCycleModelRecord = {
        id,
        dcaConfigurationId,
        cycleNumber,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      cycles.set(id, created);
      return created;
    },
    setInitialEntryPrice: (id, initialEntryPrice) => {
      const existing = cycles.get(id);
      if (!existing) {
        throw new Error(`missing cycle: ${id}`);
      }
      const updated = {
        ...existing,
        status: 'active' as const,
        initialEntryPrice,
      };
      cycles.set(id, updated);
      return updated;
    },
    setEntryTotals: (id, entryQuantity, entryQuoteQuantity, averageEntryPrice) => {
      const existing = cycles.get(id);
      if (!existing) {
        throw new Error(`missing cycle: ${id}`);
      }
      const updated = {
        ...existing,
        entryQuantity,
        entryQuoteQuantity,
        averageEntryPrice,
      };
      cycles.set(id, updated);
      return updated;
    },
    updateStatus: (id, status) => {
      const existing = cycles.get(id);
      if (!existing) {
        throw new Error(`missing cycle: ${id}`);
      }
      const updated = { ...existing, status };
      cycles.set(id, updated);
      return updated;
    },
  };

  const initialOrders = new Map<string, DcaInitialOrderModel>();

  const initialOrderPersistence: DcaInitialOrderPersistenceModel = {
    getByCycle: (cycleId) => initialOrders.get(cycleId),
    saveOrder: () => {
      throw new Error('initial order save should not be called');
    },
    updateOrder: () => {
      throw new Error('initial order update should not be called');
    },
    getFills: () => [],
    saveFills: () => [],
  };

  const runtimeFills: ExchangeTrade[] = [];

  const runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel = {
    getByCycleAndLevel: () => undefined,
    getFills: () => [],
    getFillsByCycle: () => runtimeFills.map((trade) => ({
      id: trade.tradeId,
      dcaRuntimeOrderId: savedRuntimeOrder?.id ?? 'runtime-order-1',
      exchangeTradeId: trade.tradeId,
      exchangeOrderId: trade.orderId,
      symbol: trade.symbol,
      side: trade.side,
      price: trade.price,
      quantity: trade.quantity,
      quoteQuantity: trade.quoteQuantity,
      tradeTimestamp: trade.timestamp,
      createdAt: new Date().toISOString(),
    })),
    saveOrder: (
      configurationId,
      cycleId,
      dcaOrderId,
      level,
      order,
      request,
    ) => {
      savedRuntimeOrder = {
        id: `runtime-order-${++runtimeOrderId}`,
        dcaConfigurationId: configurationId,
        dcaCycleId: cycleId,
        dcaOrderId,
        level,
        exchangeOrderId: order.orderId,
        clientOrderId: order.clientOrderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        executionMode: request.executionMode,
        status: order.status,
        quantity: order.quantity,
        executedQuantity: order.executedQuantity,
        requestedPrice: order.price,
        averageFillPrice: '94',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fills: [],
      };
      return savedRuntimeOrder;
    },
    updateOrder: (id, order) => {
      if (!savedRuntimeOrder || savedRuntimeOrder.id !== id) {
        throw new Error(`missing runtime order: ${id}`);
      }
      savedRuntimeOrder = {
        ...savedRuntimeOrder,
        status: order.status,
        executedQuantity: order.executedQuantity,
        updatedAt: new Date().toISOString(),
        fills: savedRuntimeOrder.fills ?? [],
      };
      return savedRuntimeOrder;
    },
    saveFills: (_runtimeOrderId, trades) => {
      runtimeFills.push(...trades);
      return trades.map((trade) => ({
        id: trade.tradeId,
        dcaRuntimeOrderId: savedRuntimeOrder?.id ?? 'runtime-order-1',
        exchangeTradeId: trade.tradeId,
        exchangeOrderId: trade.orderId,
        symbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        quoteQuantity: trade.quoteQuantity,
        tradeTimestamp: trade.timestamp,
        createdAt: new Date().toISOString(),
      }));
    },
  };

  const exitOrderPersistence: DcaExitOrderPersistenceModel = {
    getByCycleAndType: () => undefined,
    saveOrder: () => {
      throw new Error('exit order save should not be called');
    },
    updateOrder: () => {
      throw new Error('exit order update should not be called');
    },
    getFills: () => [],
    saveFills: () => [],
  };

  const service = new DcaStrategyService(
    cyclePersistence,
    runtimeOrderPersistence,
    exitOrderPersistence,
    initialOrderPersistence,
    runtimeOrderPersistence,
    (configurationId) =>
      configurationId === configuration.id ? configuration : undefined,
  );

  const result = await service.process(configuration.id);

  assert.ok(currentPriceCalls >= 1);
  assert.equal(placeOrderCalls, 1);
  assert.deepEqual(result.executedDcaLevels, [1]);
  assert.deepEqual(result.reachedDcaLevels, [
    {
      level: 1,
      dcaOrderId: 'dca-order-1',
      dropPercent: '5',
      triggerPrice: '95',
      reached: true,
    },
  ]);
  assert.equal(savedRuntimeOrder?.status, 'filled');
  assert.equal(runtimeFills.length, 1);
  assert.equal(cycles.get(cycle.id)?.entryQuantity, '0.002');
});


test('process executes take profit, completes the cycle, and starts the next cycle', async () => {
  const orders: ExchangeOrder[] = [];
  const trades: ExchangeTrade[] = [];
  let cycleCounter = 0;
  const cycles = new Map<string, DcaCycleModelRecord>();
  const exitOrders = new Map<string, DcaExitOrderModel>();
  const exitFills = new Map<string, DcaExitOrderFillRecord[]>();
  const initialOrders = new Map<string, DcaInitialOrderModel>();
  const runtimeOrders = new Map<string, DcaRuntimeOrderModel>();
  let placeOrderCalls = 0;

  const exchange = {
    getTradingRules: async () => ({
      symbol: 'BTCUSDT',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      status: '1',
      orderTypes: ['MARKET', 'LIMIT'],
      spotTradingAllowed: true,
      marginTradingAllowed: false,
      baseAssetPrecision: 6,
      quotePrecision: 2,
      quoteAssetPrecision: 2,
      baseCommissionPrecision: 6,
      quoteCommissionPrecision: 2,
      quoteAmountPrecision: '1',
      baseSizePrecision: '0.001',
      maxQuoteAmount: '2000000',
      quoteAmountPrecisionMarket: '1',
      maxQuoteAmountMarket: '2000000',
    }),
    getCurrentPrice: async () => '102',
    getBestBidPrice: async () => '101.9',
    getBestAskPrice: async () => '102.1',
    placeOrder: async (request: ExchangeOrderRequest) => {
      placeOrderCalls += 1;
      const order = createOrder({
        orderId: `exchange-order-${placeOrderCalls}`,
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        status: 'filled',
        quantity: request.quantity,
        executedQuantity: request.quantity,
        price: request.price,
      });
      orders.push(order);
      return order;
    },
    getOrder: async (_symbol: string, orderId: string) =>
      orders.find((order) => order.orderId === orderId) ?? orders[orders.length - 1],
    getOrderTrades: async (_symbol: string, orderId: string) => {
      const existing = trades.filter((trade) => trade.orderId === orderId);
      if (existing.length > 0) {
        return existing;
      }

      const order = orders.find((item) => item.orderId === orderId);
      if (!order || order.side !== 'buy') {
        return [];
      }

      return [
        createTrade({
          tradeId: `initial-trade-${orderId}`,
          orderId,
          side: 'buy',
          price: '102',
          quantity: order.executedQuantity,
          quoteQuantity: '0.102',
        }),
      ];
    },
    getAccount: async () => ({ balances: [] }),
    depositTestBalance: async () => undefined,
    withdrawTestBalance: async () => undefined,
  } as unknown as ExchangeModel;

  const executionMode: ExecutionModeModel = {
    id: 'takerOnly',
    name: 'Taker Only',
    enabled: true,
    execute: async <T>(operation: { maker: () => Promise<T>; taker: () => Promise<T> }) =>
      operation.taker(),
  };

  const configuration = createConfiguration(exchange, executionMode);
  const configurationWithNoOrders = { ...configuration, orders: [] };

  const cyclePersistence: DcaCyclePersistenceModel = {
    getById: (id) => cycles.get(id),
    getCurrent: (configurationId) =>
      [...cycles.values()]
        .filter((cycle) => cycle.dcaConfigurationId === configurationId)
        .sort((a, b) => b.cycleNumber - a.cycleNumber)[0],
    create: (id, configurationId, cycleNumber) => {
      const record: DcaCycleModelRecord = {
        id,
        dcaConfigurationId: configurationId,
        cycleNumber,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      cycles.set(id, record);
      cycleCounter = Math.max(cycleCounter, cycleNumber);
      return record;
    },
    setInitialEntryPrice: (id, initialEntryPrice) => {
      const cycle = cycles.get(id)!;
      const updated: DcaCycleModelRecord = {
        ...cycle,
        initialEntryPrice,
        status: 'active',
        updatedAt: new Date().toISOString(),
      };
      cycles.set(id, updated);
      return updated;
    },
    setEntryTotals: (id, entryQuantity, entryQuoteQuantity, averageEntryPrice) => {
      const cycle = cycles.get(id)!;
      const updated = {
        ...cycle,
        entryQuantity,
        entryQuoteQuantity,
        averageEntryPrice,
        updatedAt: new Date().toISOString(),
      };
      cycles.set(id, updated);
      return updated;
    },
    updateStatus: (id, status) => {
      const cycle = cycles.get(id)!;
      const updated = { ...cycle, status, updatedAt: new Date().toISOString() };
      cycles.set(id, updated);
      return updated;
    },
  };

  const initialOrderPersistence: DcaInitialOrderPersistenceModel = {
    getByCycle: (cycleId) => {
      const order = initialOrders.get(cycleId);
      return order;
    },
    saveOrder: (configurationId, cycleId, order, request) => {
      const record: DcaInitialOrderModel = {
        id: `${cycleId}-initial`,
        dcaConfigurationId: configurationId,
        dcaCycleId: cycleId,
        exchangeOrderId: order.orderId,
        executionMode: request.executionMode,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: order.status,
        quantity: order.quantity,
        executedQuantity: order.executedQuantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fills: [],
        };
      initialOrders.set(cycleId, record);
      return record;
    },
    updateOrder: (id, order) => {
      const current = [...initialOrders.values()].find((item) => item.id === id)!;
      const updated = { ...current, status: order.status, executedQuantity: order.executedQuantity };
      initialOrders.set(current.dcaCycleId, updated);
      return updated;
    },
      getFills: (initialOrderId) => {
        const order = [...initialOrders.values()].find((item) => item.id === initialOrderId);
        return order?.fills ?? [];
      },
      saveFills: (initialOrderId, trades) => {
        const order = [...initialOrders.values()].find((item) => item.id === initialOrderId);
        if (!order) {
          throw new Error(`Initial order not found: ${initialOrderId}`);
        }
        const fills = trades.map((trade, index) => ({
          id: `${initialOrderId}-fill-${index + 1}`,
          dcaInitialOrderId: initialOrderId,
          exchangeTradeId: trade.tradeId,
          exchangeOrderId: trade.orderId,
          symbol: trade.symbol,
          side: trade.side,
          price: trade.price,
          quantity: trade.quantity,
          quoteQuantity: trade.quoteQuantity,
          tradeTimestamp: trade.timestamp,
          createdAt: new Date().toISOString(),
        }));
        const updated = { ...order, fills };
        initialOrders.set(order.dcaCycleId, updated);
        return fills;
      },
  };

  const runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel = {
    getByCycleAndLevel: (cycleId, level) =>
      [...runtimeOrders.values()].find(
        (order) => order.dcaCycleId === cycleId && order.level === level,
      ),
    getFills: () => [],
    getFillsByCycle: () => [],
    saveOrder: () => {
      throw new Error('DCA order should not execute before take profit');
    },
    updateOrder: () => {
      throw new Error('DCA order should not execute before take profit');
    },
    saveFills: () => [],
  };

  const exitOrderPersistence: DcaExitOrderPersistenceModel = {
    getByCycleAndType: (cycleId, exitType) => exitOrders.get(`${cycleId}:${exitType}`) as never,
    getFills: (exitOrderId) => exitFills.get(exitOrderId) ?? [],
    saveOrder: (configurationId, cycleId, exitType, order, request) => {
      const record: DcaExitOrderModel = {
        id: `${cycleId}-${exitType}`,
        dcaConfigurationId: configurationId,
        dcaCycleId: cycleId,
        exitType,
        exchangeOrderId: order.orderId,
        executionMode: request.executionMode,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: order.status,
        quantity: order.quantity,
        executedQuantity: order.executedQuantity,
        requestedPrice: request.price,
        averageFillPrice: order.price,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fills: [],
      };
      exitOrders.set(`${cycleId}:${exitType}`, record);
      return record;
    },
    updateOrder: (id, order) => {
      const current = [...exitOrders.values()].find((item) => item.id === id)!;
      const updated: DcaExitOrderModel = {
        ...current,
        status: order.status,
        executedQuantity: order.executedQuantity,
        fills: current.fills ?? [],
      };
      exitOrders.set(`${current.dcaCycleId}:${current.exitType}`, updated);
      return updated;
    },
    saveFills: (exitOrderId, exitTrades) => {
      const fills = exitTrades.map((trade, index) => ({
        id: `${exitOrderId}-fill-${index + 1}`,
        dcaExitOrderId: exitOrderId,
        exchangeTradeId: trade.tradeId,
        exchangeOrderId: trade.orderId,
        symbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        quoteQuantity: trade.quoteQuantity,
        tradeTimestamp: trade.timestamp,
        createdAt: new Date().toISOString(),
      }));
      exitFills.set(exitOrderId, fills);
      return fills;
    },
  };

  const service = new DcaStrategyService(
    cyclePersistence,
    runtimeOrderPersistence,
    exitOrderPersistence,
    initialOrderPersistence,
    { get: (configurationId: string, level: number) => runtimeOrderPersistence.getByCycleAndLevel(cycles.get(configurationId)?.id ?? '', level) } as never,
    (configurationId) => configurationId === configuration.id ? configurationWithNoOrders : undefined,
  );

  const cycle1 = cyclePersistence.create('configuration-1-cycle-1', configuration.id, 1);
  cyclePersistence.setInitialEntryPrice(cycle1.id, '100');
  cyclePersistence.setEntryTotals(cycle1.id, '0.001', '0.1', '100');
  cyclePersistence.updateStatus(cycle1.id, 'active');

  const tpTrade = createTrade({
    tradeId: 'tp-trade-1',
    orderId: 'exchange-order-1',
    side: 'sell',
    price: '102',
    quantity: '0.001',
    quoteQuantity: '0.102',
  });
  trades.push(tpTrade);

  const result = await service.process(configuration.id);

  assert.equal(result.takeProfitReached, true);
  assert.equal(result.stopLossReached, false);
  assert.deepEqual(result.executedDcaLevels, []);
  assert.equal(cycles.get(cycle1.id)?.status, 'completed');
  assert.equal(cycleCounter, 2);

  const cycle2 = cycles.get('configuration-1-cycle-2');
  assert.ok(cycle2);
  assert.equal(cycle2.cycleNumber, 2);
  assert.equal(cycle2.status, 'active');

  const tpExit = exitOrders.get(`${cycle1.id}:takeProfit`);
  assert.ok(tpExit);
  assert.equal(tpExit.side, 'sell');
  assert.equal(tpExit.quantity, '0.001');
  assert.equal(tpExit.status, 'filled');
  assert.equal(exitFills.get(tpExit.id)?.length, 1);

  assert.equal(initialOrders.has(cycle2.id), true);
  assert.equal(placeOrderCalls, 2);
});


test('process reconciles a persisted pending DCA order when its level is reached', async () => {
  const executionMode: ExecutionModeModel = {
    id: 'takerOnly',
    name: 'Taker Only',
    enabled: true,
    execute: async <T>(operation: { maker: () => Promise<T>; taker: () => Promise<T> }) =>
      operation.taker(),
  };

  let getOrderCalls = 0;
  let getOrderTradesCalls = 0;
  let placeOrderCalls = 0;

  const exchange: ExchangeModel = {
    id: 'mexc',
    name: 'MEXC',
    enabled: true,
    balanceModes: {
      get: () => balanceModeForExchange(),
    },
    getAccount: async () => ({ balances: [] }),
    depositTestBalance: () => {},
    withdrawTestBalance: () => {},
    getTradingRules: async () => ({
      symbol: 'BTCUSDT',
      status: '1',
      orderTypes: ['MARKET'],
      spotTradingAllowed: true,
      marginTradingAllowed: false,
      baseAssetPrecision: 6,
      quotePrecision: 2,
      quoteAssetPrecision: 2,
      baseCommissionPrecision: 6,
      quoteCommissionPrecision: 2,
      maxQuoteAmount: '2000000',
      quoteAmountPrecision: '1',
      baseSizePrecision: '0.001',
      quoteAmountPrecisionMarket: '1',
      maxQuoteAmountMarket: '2000000',
    }),
    getCurrentPrice: async () => '94',
    getBestBidPrice: async () => '93.9',
    getBestAskPrice: async () => '94.1',
    placeOrder: async () => {
      placeOrderCalls += 1;
      return createOrder({
        orderId: 'unexpected-new-order',
      });
    },
    getOrder: async () => {
      getOrderCalls += 1;
      return createOrder({
        orderId: 'exchange-dca-pending-1',
        status: 'filled',
        quantity: '0.001',
        executedQuantity: '0.001',
      });
    },
    getOrderTrades: async () => {
      getOrderTradesCalls += 1;
      return [
        createTrade({
          tradeId: 'dca-pending-trade-1',
          orderId: 'exchange-dca-pending-1',
          price: '94',
          quantity: '0.001',
          quoteQuantity: '0.094',
        }),
      ];
    },
  };

  const configuration = {
    ...createConfiguration(exchange, executionMode),
    orders: [
      {
        id: 'dca-order-1',
        dcaOrderId: 'dca-order-1',
        level: 1,
        dropPercent: '5',
      },
    ] as DcaConfigurationOrderModel[],
  } as DcaConfigurationModel;

  const cycle: DcaCycleModelRecord = {
    id: 'configuration-1-cycle-1',
    dcaConfigurationId: configuration.id,
    cycleNumber: 1,
    status: 'active',
    initialEntryPrice: '100',
    entryQuantity: '0.001',
    entryQuoteQuantity: '0.1',
    averageEntryPrice: '100',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const cycles = new Map<string, DcaCycleModelRecord>([[cycle.id, cycle]]);

  const cyclePersistence: DcaCyclePersistenceModel = {
    getById: (id) => cycles.get(id),
    getCurrent: (configurationId) =>
      [...cycles.values()].find(
        (item) =>
          item.dcaConfigurationId === configurationId &&
          (item.status === 'active' || item.status === 'pending'),
      ),
    create: (id, dcaConfigurationId, cycleNumber) => {
      const created: DcaCycleModelRecord = {
        id,
        dcaConfigurationId,
        cycleNumber,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      cycles.set(id, created);
      return created;
    },
    setInitialEntryPrice: (id, initialEntryPrice) => {
      const existing = cycles.get(id);
      if (!existing) throw new Error(`missing cycle: ${id}`);
      const updated = {
        ...existing,
        status: 'active' as const,
        initialEntryPrice,
      };
      cycles.set(id, updated);
      return updated;
    },
    setEntryTotals: (id, entryQuantity, entryQuoteQuantity, averageEntryPrice) => {
      const existing = cycles.get(id);
      if (!existing) throw new Error(`missing cycle: ${id}`);
      const updated = {
        ...existing,
        entryQuantity,
        entryQuoteQuantity,
        averageEntryPrice,
      };
      cycles.set(id, updated);
      return updated;
    },
    updateStatus: (id, status) => {
      const existing = cycles.get(id);
      if (!existing) throw new Error(`missing cycle: ${id}`);
      const updated = { ...existing, status };
      cycles.set(id, updated);
      return updated;
    },
  };

  const initialOrderPersistence: DcaInitialOrderPersistenceModel = {
    getByCycle: () => undefined,
    saveOrder: () => {
      throw new Error('initial order save should not be called');
    },
    updateOrder: () => {
      throw new Error('initial order update should not be called');
    },
    getFills: () => [],
    saveFills: () => [],
  };

  const runtimeOrder: DcaRuntimeOrderModel = {
    id: 'runtime-order-1',
    dcaConfigurationId: configuration.id,
    dcaCycleId: cycle.id,
    dcaOrderId: 'dca-order-1',
    level: 1,
    exchangeOrderId: 'exchange-dca-pending-1',
    executionMode: 'makerOnly',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    status: 'open',
    quantity: '0.001',
    executedQuantity: '0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fills: [],
  };

  let updatedRuntimeOrder = runtimeOrder;
  const runtimeFills: ExchangeTrade[] = [];

  const runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel = {
    getByCycleAndLevel: () => updatedRuntimeOrder,
    getFills: () => [],
    getFillsByCycle: () =>
      runtimeFills.map((trade) => ({
        id: trade.tradeId,
        dcaRuntimeOrderId: updatedRuntimeOrder.id,
        exchangeTradeId: trade.tradeId,
        exchangeOrderId: trade.orderId,
        symbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        quoteQuantity: trade.quoteQuantity,
        tradeTimestamp: trade.timestamp,
        createdAt: new Date().toISOString(),
      })),
    saveOrder: (
      _configurationId,
      _cycleId,
      _dcaOrderId,
      _level,
      _order,
      _request,
    ) => {
      throw new Error('new DCA order must not be created');
    },
    updateOrder: (id, order) => {
      assert.equal(id, runtimeOrder.id);
      updatedRuntimeOrder = {
        ...updatedRuntimeOrder,
        status: order.status,
        executedQuantity: order.executedQuantity,
        updatedAt: new Date().toISOString(),
        fills: updatedRuntimeOrder.fills ?? [],
      };
      return updatedRuntimeOrder;
    },
    saveFills: (_runtimeOrderId, trades) => {
      runtimeFills.push(...trades);
      return trades.map((trade) => ({
        id: trade.tradeId,
        dcaRuntimeOrderId: runtimeOrder.id,
        exchangeTradeId: trade.tradeId,
        exchangeOrderId: trade.orderId,
        symbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        quoteQuantity: trade.quoteQuantity,
        tradeTimestamp: trade.timestamp,
        createdAt: new Date().toISOString(),
      }));
    },
  };

  const exitOrderPersistence: DcaExitOrderPersistenceModel = {
    getByCycleAndType: () => undefined,
    saveOrder: () => {
      throw new Error('exit order save should not be called');
    },
    updateOrder: () => {
      throw new Error('exit order update should not be called');
    },
    getFills: () => [],
    saveFills: () => [],
  };

  const service = new DcaStrategyService(
    cyclePersistence,
    runtimeOrderPersistence,
    exitOrderPersistence,
    initialOrderPersistence,
    runtimeOrderPersistence,
    (configurationId) =>
      configurationId === configuration.id ? configuration : undefined,
  );

  const result = await service.process(configuration.id);

  assert.equal(getOrderCalls, 1);
  assert.equal(getOrderTradesCalls, 1);
  assert.equal(placeOrderCalls, 0);
  assert.deepEqual(result.executedDcaLevels, [1]);
  assert.equal(updatedRuntimeOrder.status, 'filled');
  assert.equal(updatedRuntimeOrder.executedQuantity, '0.001');
  assert.equal(runtimeFills.length, 1);
  assert.equal(cycles.get(cycle.id)?.entryQuantity, '0.002');
});
