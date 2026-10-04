import assert from 'node:assert/strict';
import test from 'node:test';
import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { ExchangeModel } from '../../domain/exchange/exchangeModel';
import type { ExchangeAccount } from '../../domain/exchange/exchangeAccount';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../domain/exchange/exchangeOrder';
import { DcaInitialOrderService } from './dcaInitialOrderService';

function createConfiguration(
  balanceMode: 'live' | 'test',
  exchange: ExchangeModel,
): DcaConfigurationModel {
  return {
    strategy: {} as never,
    id: 'dca-btcusdt',
    strategyTypeId: 'dca',
    name: 'BTCUSDT DCA',
    balanceModeId: balanceMode,
    exchangeId: 'mexc',
    executionModeId: 'takerOnly',
    balanceMode: { id: balanceMode } as never,
    exchange,
    executionMode: { id: 'takerOnly' } as never,
    symbol: 'BTCUSDT',
    takeProfitPercent: '1',
    stopLossPercent: '50',
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    orders: [],
  } as DcaConfigurationModel;
}

function createAccount(free: string): ExchangeAccount {
  return {
    balances: [
      {
        asset: 'USDT',
        free,
        locked: '0',
      },
    ],
  };
}

function createService(
  balanceMode: 'live' | 'test',
  account: ExchangeAccount,
  placedOrders: ExchangeOrder[],
): DcaInitialOrderService {
  const exchange = {
    getTradingRules: async () => ({
      symbol: 'BTCUSDT',
      status: '1',
      orderTypes: ['LIMIT', 'MARKET'],
      spotTradingAllowed: true,
      marginTradingAllowed: false,
      baseAssetPrecision: 8,
      quotePrecision: 8,
      quoteAssetPrecision: 8,
      baseCommissionPrecision: 8,
      quoteCommissionPrecision: 8,
      quoteAmountPrecision: '1',
      baseSizePrecision: '0.000001',
      maxQuoteAmount: '2000000',
      quoteAmountPrecisionMarket: '1',
      maxQuoteAmountMarket: '2000000',
    }),
    getCurrentPrice: async () => '100000',
    getBestBidPrice: async () => '99999',
    getBestAskPrice: async () => '100000',
    getSymbolInfo: async () => ({
      symbol: 'BTCUSDT',
      status: '1',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
    }),
    getAccount: async () => account,
    getOrderTrades: async () => [{
      tradeId: 'trade-1',
      orderId: 'order-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      price: '100000',
      quantity: '0.00001',
      quoteQuantity: '1',
      timestamp: 1000,
    }],
    placeOrder: async (request: ExchangeOrderRequest) => {
      const order = {
        orderId: `order-${placedOrders.length + 1}`,
        clientOrderId: undefined,
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        status: 'filled',
        quantity: request.quantity,
        executedQuantity: request.quantity,
        price: undefined,
      } as unknown as ExchangeOrder;
      placedOrders.push(order);
      return order;
    },
  } as unknown as ExchangeModel;

  const initialOrder = {
    id: 'initial-1',
    dcaConfigurationId: 'dca-btcusdt',
    dcaCycleId: 'cycle-1',
    exchangeOrderId: 'order-1',
    triggerPrice: '100000',
    clientOrderId: undefined,
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    executionMode: 'takerOnly',
    status: 'filled',
    quantity: '0.00001',
    executedQuantity: '0.00001',
    requestedPrice: undefined,
    averageFillPrice: '100000',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    fills: [],
  };

  const persistence = {
    saveOrder: () => initialOrder,
    getByCycle: () => initialOrder,
    updateOrder: () => initialOrder,
    saveFills: () => [],
    getFills: () => [],
  } as never;

  const cycles = {
    getById: () => undefined,
    getCurrent: () => undefined,
    create: (
      id: string,
      dcaConfigurationId: string,
      cycleNumber: number,
    ) => ({
      id,
      dcaConfigurationId,
      cycleNumber,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
    setInitialEntryPrice: (
      id: string,
      initialEntryPrice: string,
    ) => ({
      id,
      dcaConfigurationId: 'dca-btcusdt',
      cycleNumber: 1,
      status: 'active',
      initialEntryPrice,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
    setEntryTotals: (
      id: string,
      entryQuantity: string,
      entryQuoteQuantity: string,
      averageEntryPrice: string,
    ) => ({
      id,
      dcaConfigurationId: 'dca-btcusdt',
      cycleNumber: 1,
      status: 'active',
      entryQuantity,
      entryQuoteQuantity,
      averageEntryPrice,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
    updateStatus: (
      id: string,
      status: 'pending' | 'active' | 'completed' | 'stopped',
    ) => ({
      id,
      dcaConfigurationId: 'dca-btcusdt',
      cycleNumber: 1,
      status,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  } as never;

  return new DcaInitialOrderService(
    cycles,
    persistence,
    () => createConfiguration(balanceMode, exchange),
  );
}

test('live initial order is allowed when quote balance is sufficient', async () => {
  const placedOrders: ExchangeOrder[] = [];
  const service = createService(
    'live',
    createAccount('2'),
    placedOrders,
  );

  await service.startCycleAndExecute('dca-btcusdt');

  assert.equal(placedOrders.length, 1);
});

test('live initial order is blocked when quote balance is insufficient', async () => {
  const placedOrders: ExchangeOrder[] = [];
  const service = createService(
    'live',
    createAccount('0.5'),
    placedOrders,
  );

  await assert.rejects(
    () => service.startCycleAndExecute('dca-btcusdt'),
    /Insufficient live balance for USDT/,
  );

  assert.equal(placedOrders.length, 0);
});

test('test initial order does not require live balance', async () => {
  const placedOrders: ExchangeOrder[] = [];
  const service = createService(
    'test',
    createAccount('0'),
    placedOrders,
  );

  await service.startCycleAndExecute('dca-btcusdt');

  assert.equal(placedOrders.length, 1);
});
