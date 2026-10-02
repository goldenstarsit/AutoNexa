import assert from 'node:assert/strict';
import { OrderExecutionService } from './orderExecutionService';
import type { OrderExecutionAdapter } from './orderExecutionService';
import type { ExchangeOrder } from '../../domain/exchange/exchangeOrder';
import type { ExchangeOrderRequest } from '../../domain/exchange/exchangeOrder';

function createOrder(request: ExchangeOrderRequest): ExchangeOrder {
  return {
    orderId: `test-${request.type}-${request.side}`,
    symbol: request.symbol,
    side: request.side,
    type: request.type,
    status: 'filled',
    quantity: request.quantity,
    executedQuantity: request.quantity,
  };
}

function createAdapter(
  placeOrder: (request: ExchangeOrderRequest) => Promise<ExchangeOrder>,
): OrderExecutionAdapter {
  return {
    executionCapabilities: {
      maker: true,
      taker: true,
      hybrid: true,
    },
    placeOrder,
  };
}

async function run() {

const baseRequest: ExchangeOrderRequest = {
  symbol: 'BTCUSDT',
  side: 'buy',
  type: 'makerOnly',
  executionMode: 'makerOnly',
  quantity: '0.001',
  price: '100',
};

{
  const calls: ExchangeOrderRequest[] = [];
  const service = new OrderExecutionService(
    createAdapter(async (request) => {
      calls.push(request);
      return createOrder(request);
    }),
  );

  const result = await service.executeWithResult(baseRequest);

  assert.equal(result.mode, 'makerOnly');
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].type, 'maker');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'makerOnly');
  assert.equal(calls[0].executionMode, 'makerOnly');
}

{
  const calls: ExchangeOrderRequest[] = [];
  const service = new OrderExecutionService(
    createAdapter(async (request) => {
      calls.push(request);
      return createOrder(request);
    }),
  );

  const result = await service.executeWithResult({
    ...baseRequest,
    type: 'market',
    executionMode: 'takerOnly',
    price: undefined,
  });

  assert.equal(result.mode, 'takerOnly');
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].type, 'taker');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'market');
  assert.equal(calls[0].executionMode, 'takerOnly');
}

{
  const calls: ExchangeOrderRequest[] = [];
  const service = new OrderExecutionService(
    createAdapter(async (request) => {
      calls.push(request);
      return createOrder(request);
    }),
  );

  const result = await service.executeWithResult({
    ...baseRequest,
    type: 'limit',
    executionMode: 'hybrid',
  });

  assert.equal(result.mode, 'hybrid');
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].type, 'maker');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'makerOnly');
  assert.equal(calls[0].executionMode, 'makerOnly');
}

{
  const calls: ExchangeOrderRequest[] = [];
  const service = new OrderExecutionService(
    createAdapter(async (request) => {
      calls.push(request);

      if (request.executionMode === 'makerOnly') {
        const error = new Error('maker unavailable') as Error & {
          data?: unknown;
        };
        error.data = { code: 'maker_unavailable' };
        throw error;
      }

      return createOrder(request);
    }),
  );

  const result = await service.executeWithResult({
    ...baseRequest,
    type: 'limit',
    executionMode: 'hybrid',
  });

  assert.equal(result.mode, 'hybrid');
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].type, 'maker');
  assert.equal(result.attempts[1].type, 'taker');
  assert.equal(result.attempts[1].request.executionMode, 'takerOnly');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].executionMode, 'makerOnly');
  assert.equal(calls[1].executionMode, 'takerOnly');
  assert.equal(calls[1].type, 'market');
}

console.log('orderExecutionService tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
