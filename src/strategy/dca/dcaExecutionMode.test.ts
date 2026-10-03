import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type {
  BalanceModeId,
  BalanceSourceModel,
} from '../../domain/balance/balanceModeModel';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../domain/exchange/exchangeOrder';
import type {
  DcaCycleModelRecord,
  DcaCyclePersistenceModel,
} from '../../domain/strategy/dca/dcaCycleModel';
import type {
  DcaExitOrderModel,
  DcaExitOrderPersistenceModel,
} from '../../domain/strategy/dca/dcaExitOrderModel';

import { DcaInitialOrderService } from './dcaInitialOrderService';
import { DcaOrderService } from './dcaOrderService';
import { DcaTakeProfitService } from './dcaTakeProfitService';
import { DcaStopLossService } from './dcaStopLossService';

const configurationId = 'dca-config-1';
const cycleId = 'dca-cycle-1';
const symbol = 'BTCUSDT';

type Mode = 'makerOnly' | 'takerOnly' | 'hybrid';

function createCyclePersistence(): DcaCyclePersistenceModel {
  let record: DcaCycleModelRecord = {
    id: cycleId,
    dcaConfigurationId: configurationId,
    cycleNumber: 1,
    status: 'active',
    initialEntryPrice: '100',
    entryQuantity: '1',
    entryQuoteQuantity: '100',
    averageEntryPrice: '100',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  return {
    getById: (id) => (id === record.id ? record : undefined),
    getCurrent: (id) =>
      id === record.dcaConfigurationId ? record : undefined,
    create: (id, dcaConfigurationId, cycleNumber) => {
      record = {
        ...record,
        id,
        dcaConfigurationId,
        cycleNumber,
        status: 'pending',
      };
      return record;
    },
    setInitialEntryPrice: (id, initialEntryPrice) => {
      record = {
        ...record,
        id,
        initialEntryPrice,
      };
      return record;
    },
    setEntryTotals: (
      id,
      entryQuantity,
      entryQuoteQuantity,
      averageEntryPrice,
    ) => {
      record = {
        ...record,
        id,
        entryQuantity,
        entryQuoteQuantity,
        averageEntryPrice,
      };
      return record;
    },
    updateStatus: (id, status) => {
      record = {
        ...record,
        id,
        status,
      };
      return record;
    },
  };
}

function createExchange(
  mode: Mode,
  currentPrice: string,
  captured: ExchangeOrderRequest[],
): ExchangeModel {
  const exchange = {
    id: 'mexc',
    name: 'MEXC',
    enabled: true,
    balanceModes: [],

    async getTradingRules() {
      return {
        symbol,
        status: 'TRADING',
        orderTypes: ['MARKET', 'LIMIT'],
        spotTradingAllowed: true,
        marginTradingAllowed: false,
        baseAssetPrecision: 8,
        quotePrecision: 8,
        quoteAssetPrecision: 8,
        baseCommissionPrecision: 8,
        quoteCommissionPrecision: 8,
        quoteAmountPrecision: '1',
        baseSizePrecision: '0.001',
        maxQuoteAmount: '2000000',
        quoteAmountPrecisionMarket: '10',
        maxQuoteAmountMarket: '2000000',
      };
    },

    async getCurrentPrice() {
      return currentPrice;
    },

    async getBestBidPrice() {
      return '99.9';
    },

    async getBestAskPrice() {
      return '100.1';
    },

    async placeOrder(request: ExchangeOrderRequest) {
      captured.push(request);

      const order: ExchangeOrder = {
        orderId: `${mode}-order-${captured.length}`,
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        status: 'filled',
        quantity: request.quantity,
        executedQuantity: request.quantity,
        ...(request.price ? { price: request.price } : {}),
      };

      return order;
    },

    async getOrderTrades() {
      return [
        {
          tradeId: 'trade-1',
          orderId: `${mode}-order-1`,
          symbol,
          side: 'sell',
          price: currentPrice,
          quantity: '1',
          quoteQuantity: currentPrice,
          timestamp: Date.now(),
        },
      ];
    },
  } as unknown as ExchangeModel;

  return exchange;
}

function createConfiguration(
  mode: Mode,
  exchange: ExchangeModel,
) {
  return {
    id: configurationId,
    strategyTypeId: 'dca',
    strategy: {
      id: 'strategy-1',
      strategyTypeId: 'dca',
      name: 'DCA',
      enabled: true,
      instances: {
        get: () => undefined,
        getAll: () => [],
      },
    },
    name: 'BTC DCA',
    balanceModeId: 'test' as BalanceModeId,
    exchangeId: 'mexc',
    executionModeId: mode,
    balanceMode: {
      id: 'test' as BalanceModeId,
      name: 'Test',
      enabled: true,
      source: {
        getAccount: async () => ({
          balances: [],
        }),

      } as BalanceSourceModel,
      testOperations: {
        depositTestBalance: () => {},
        withdrawTestBalance: () => {},
      },
    },
    exchange,
    executionMode: {
      id: mode,
      name: mode,
      enabled: true,
        execute: async <T>({
          maker,
          taker,
        }: {
          maker: () => Promise<T>;
          taker: () => Promise<T>;
        }): Promise<T> =>
          mode === 'makerOnly'
            ? maker()
            : mode === 'takerOnly'
              ? taker()
              : maker(),
    },
    symbol,
    takeProfitPercent: '1',
    stopLossPercent: '50',
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    orders: [
      {
        id: 'config-order-1',
        dcaOrderId: 'dca-order-1',
        level: 1,
        dropPercent: '5',
      },
    ],
  };
}

function createExitPersistence(): DcaExitOrderPersistenceModel {
  let saved: DcaExitOrderModel | undefined;

  return {
    getByCycleAndType: (id, type) =>
      saved?.dcaCycleId === id && saved.exitType === type
        ? saved
        : undefined,

    getFills: () => [],

    saveOrder: (configId, id, exitType, order, request) => {
      saved = {
        id: `${exitType}-1`,
        dcaConfigurationId: configId,
        dcaCycleId: id,
        exitType,
        exchangeOrderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        executionMode: request.executionMode,
        status: order.status,
        quantity: order.quantity,
        executedQuantity: order.executedQuantity,
        requestedPrice: request.price,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        fills: [],
      };
      return saved;
    },

    updateOrder: (_id, order) => {
      if (!saved) {
        throw new Error('No saved exit order');
      }

      saved = {
        ...saved,
        status: order.status,
        executedQuantity: order.executedQuantity,
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      return saved;
    },

    saveFills: () => [],
  };
}

function expectedBuy(mode: Mode): ExchangeOrderRequest {
  return {
    symbol,
    side: 'buy',
    type:
      mode === 'makerOnly'
        ? 'makerOnly'
        : mode === 'hybrid'
          ? 'limit'
          : 'market',
    executionMode: mode,
    quantity: '0.1',
    ...(mode === 'makerOnly' || mode === 'hybrid'
      ? { price: '99.9' }
      : {}),
  };
}

function expectedSell(mode: Mode, price = '100.1'): ExchangeOrderRequest {
  return {
    symbol,
    side: 'sell',
    type:
      mode === 'makerOnly'
        ? 'makerOnly'
        : mode === 'hybrid'
          ? 'limit'
          : 'market',
    executionMode: mode,
    quantity: '1',
    ...(mode === 'makerOnly' || mode === 'hybrid'
      ? { price }
      : {}),
  };
}

for (const mode of ['makerOnly', 'hybrid', 'takerOnly'] as const) {
  test(`DCA ${mode}: initial order request`, async () => {
    const captured: ExchangeOrderRequest[] = [];
    const exchange = createExchange(mode, '100', captured);
    const configuration = createConfiguration(mode, exchange);

    const service = new DcaInitialOrderService(
      createCyclePersistence(),
      {} as never,
      () => configuration,
    );

    const preparation = await service.prepare(configurationId);

    assert.deepEqual(preparation.request, expectedBuy(mode));
  });

  test(`DCA ${mode}: DCA order request`, async () => {
    const captured: ExchangeOrderRequest[] = [];
    const exchange = createExchange(mode, '100', captured);
    const configuration = createConfiguration(mode, exchange);

    const service = new DcaOrderService(
      createCyclePersistence(),
      {} as never,
      () => configuration,
    );

    const preparation = await service.prepare(configurationId, cycleId, 1);

    assert.deepEqual(preparation.request, expectedBuy(mode));
  });

  test(`DCA ${mode}: take-profit request`, async () => {
    const captured: ExchangeOrderRequest[] = [];
    const exchange = createExchange(mode, '101', captured);
    const configuration = createConfiguration(mode, exchange);

    const service = new DcaTakeProfitService(
      createCyclePersistence(),
      createExitPersistence(),
      () => configuration,
    );

    await service.execute(configurationId);

    assert.deepEqual(captured[0], expectedSell(mode, '101'));
  });

  test(`DCA ${mode}: stop-loss request`, async () => {
    const captured: ExchangeOrderRequest[] = [];
    const exchange = createExchange(mode, '50', captured);
    const configuration = createConfiguration(mode, exchange);

    const service = new DcaStopLossService(
      createCyclePersistence(),
      createExitPersistence(),
      () => configuration,
    );

    await service.execute(configurationId);

    assert.deepEqual(captured[0], expectedSell(mode));
  });
}
