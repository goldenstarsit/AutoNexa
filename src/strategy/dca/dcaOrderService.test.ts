import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type { ExchangeOrder, ExchangeOrderRequest } from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type { ExecutionModeModel } from '../../domain/execution/executionModeModel';
import type {
  DcaConfigurationModel,
  DcaConfigurationOrderModel,
} from '../../domain/strategy/dca/dcaConfigurationModel';
import type {
  DcaCycleModelRecord,
  DcaCyclePersistenceModel,
} from '../../domain/strategy/dca/dcaCycleModel';
import type {
  DcaRuntimeOrderModel,
  DcaRuntimeOrderPersistenceModel,
} from '../../domain/strategy/dca/dcaRuntimeOrderModel';
import { DcaOrderService } from './dcaOrderService';

function order(id: string, price: string, quantity = '1'): ExchangeOrder {
  return {
    orderId: id,
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    status: 'filled',
    quantity,
    executedQuantity: quantity,
    price,
  };
}

function trade(
  id: string,
  orderId: string,
  price: string,
): ExchangeTrade {
  return {
    tradeId: id,
    orderId,
    symbol: 'BTCUSDT',
    side: 'buy',
    price,
    quantity: '1',
    quoteQuantity: price,
    timestamp: Date.now(),
  };
}

function runtimeOrder(
  level: number,
  exchangeOrderId: string,
): DcaRuntimeOrderModel {
  return {
    id: `runtime-${level}`,
    dcaConfigurationId: 'configuration-1',
    dcaCycleId: 'cycle-1',
    dcaOrderId: `dca-order-${level}`,
    level,
    exchangeOrderId,
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    executionMode: 'takerOnly',
    status: 'filled',
    quantity: '1',
    executedQuantity: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fills: [],
  };
}

test('execute combines initial entry with only the current DCA fills', async () => {
  let cycle: DcaCycleModelRecord = {
    id: 'cycle-1',
    dcaConfigurationId: 'configuration-1',
    cycleNumber: 1,
    status: 'active',
    initialEntryPrice: '100',
    entryQuantity: '1',
    entryQuoteQuantity: '100',
    averageEntryPrice: '100',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const executedLevels = new Set<number>();

  const cyclePersistence: DcaCyclePersistenceModel = {
    getById: (id) => id === cycle.id ? cycle : undefined,
    getCurrent: (configurationId) =>
      configurationId === cycle.dcaConfigurationId ? cycle : undefined,
    create: () => cycle,
    setInitialEntryPrice: () => cycle,
    setEntryTotals: (
      id,
      entryQuantity,
      entryQuoteQuantity,
      averageEntryPrice,
    ) => {
      if (id !== cycle.id) throw new Error('unexpected cycle');
      cycle = {
        ...cycle,
        entryQuantity,
        entryQuoteQuantity,
        averageEntryPrice,
      };
      return cycle;
    },
    updateStatus: () => cycle,
  };

  const runtimeOrders = new Map<number, DcaRuntimeOrderModel>();

  const runtimePersistence: DcaRuntimeOrderPersistenceModel = {
    getByCycleAndLevel: (_cycleId, level) =>
      runtimeOrders.get(level),
    getFills: () => [],
    getFillsByCycle: () => [],
    saveOrder: (
      _configurationId,
      _cycleId,
      _dcaOrderId,
      level,
      exchangeOrder,
    ) => {
      const saved = runtimeOrder(level, exchangeOrder.orderId);
      runtimeOrders.set(level, saved);
      executedLevels.add(level);
      return saved;
    },
    updateOrder: (id, exchangeOrder) => {
      const existing = [...runtimeOrders.values()].find(
        (item) => item.id === id,
      );
      if (!existing) throw new Error(`missing runtime order: ${id}`);
      const updated = {
        ...existing,
        status: exchangeOrder.status,
        executedQuantity: exchangeOrder.executedQuantity,
      };
      runtimeOrders.set(existing.level, updated);
      return updated;
    },
    saveFills: () => [],
  };

  const executionMode: ExecutionModeModel = {
    id: 'takerOnly',
    name: 'Taker Only',
    enabled: true,
    execute: async <T>(operation: {
      maker: () => Promise<T>;
      taker: () => Promise<T>;
    }) => operation.taker(),
  };

  let currentLevel = 1;

  const exchange: ExchangeModel = {
    id: 'mexc',
    name: 'MEXC',
    enabled: true,
    balanceModes: {
      get: () => ({
        id: 'test',
        name: 'Test',
        enabled: true,
        source: {
          getAccount: async () => ({ balances: [] }),
        },
      }),
    },
    getAccount: async () => ({ balances: [] }),
    depositTestBalance: () => {},
    withdrawTestBalance: () => {},
    getSymbolInfo: async () => undefined,
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
      baseSizePrecision: '1',
      maxQuoteAmount: '2000000',
      quoteAmountPrecisionMarket: '1',
      maxQuoteAmountMarket: '2000000',
    }),
    getCurrentPrice: async () =>
      currentLevel === 1 ? '90' : '70',
    getBestBidPrice: async () => '89',
    getBestAskPrice: async () => '91',
    placeOrder: async () => {
      const level = currentLevel;
      return order(
        `exchange-${level}`,
        level === 1 ? '90' : '70',
      );
    },
    getOrder: async () => {
      throw new Error('getOrder should not be called');
    },
    getOrderTrades: async (_symbol, orderId) => {
      const level = orderId === 'exchange-1' ? 1 : 2;
      return [
        trade(
          `trade-${level}`,
          orderId,
          level === 1 ? '90' : '70',
        ),
      ];
    },
    cancelOrder: async () => {
      throw new Error('cancelOrder should not be called');
    },
  };

  const orders: DcaConfigurationOrderModel[] = [
    {
      id: 'dca-order-1',
      dcaOrderId: 'dca-order-1',
      level: 1,
      dropPercent: '10',
    },
    {
      id: 'dca-order-2',
      dcaOrderId: 'dca-order-2',
      level: 2,
      dropPercent: '30',
    },
  ];

  const configuration = {
    id: 'configuration-1',
    strategyTypeId: 'strategy-type-dca',
    name: 'BTC DCA',
    balanceModeId: 'test',
    exchangeId: 'mexc',
    executionModeId: executionMode.id,
    balanceMode: exchange.balanceModes.get('test'),
    exchange,
    executionMode,
    symbol: 'BTCUSDT',
    takeProfitPercent: '1',
    stopLossPercent: '50',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orders,
    strategy: {
      id: 'dca',
      strategyTypeId: 'strategy-type-dca',
      name: 'DCA',
      enabled: true,
      instances: {
        get: () => undefined,
        getAll: () => [],
      },
    },
  } as DcaConfigurationModel;

  const service = new DcaOrderService(
    cyclePersistence,
    runtimePersistence,
    (configurationId) =>
      configurationId === configuration.id ? configuration : undefined,
  );

  const first = await service.prepare(
    configuration.id,
    cycle.id,
    1,
    '90',
  );
  await service.execute(first);

  assert.equal(cycle.entryQuantity, '2');
  assert.equal(cycle.entryQuoteQuantity, '190');
  assert.equal(cycle.averageEntryPrice, '95');

  currentLevel = 2;

  const second = await service.prepare(
    configuration.id,
    cycle.id,
    2,
    '70',
  );
  await service.execute(second);

  assert.equal(cycle.entryQuantity, '3');
  assert.equal(cycle.entryQuoteQuantity, '260');
  assert.equal(cycle.averageEntryPrice, '86.666666666666666666');
  assert.deepEqual([...executedLevels], [1, 2]);
});
