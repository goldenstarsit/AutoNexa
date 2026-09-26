import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from './exchangeOrder';
import { createOrderExecutionPlan } from './orderExecution';
import type {
  OrderExecutionAttempt,
  OrderExecutionResult,
} from './orderExecutionResult';
import type { OrderExecutionCapabilities } from './orderExecutionCapabilities';

export interface OrderExecutionAdapter {
  readonly executionCapabilities: OrderExecutionCapabilities;
  placeOrder(request: ExchangeOrderRequest): Promise<ExchangeOrder>;
}

export class OrderExecutionService {
  constructor(private readonly adapter: OrderExecutionAdapter) {}

  async execute(request: ExchangeOrderRequest): Promise<ExchangeOrder> {
    const result = await this.executeWithResult(request);

    if (!result.order) {
      throw new Error('Order execution failed');
    }

    return result.order;
  }

  async executeWithResult(
    request: ExchangeOrderRequest,
  ): Promise<OrderExecutionResult> {
    const plan = createOrderExecutionPlan(request);

    if (request.executionMode === 'makerOnly' && !this.adapter.executionCapabilities.maker) {
      throw new Error('Maker-only execution is not supported by this exchange adapter');
    }

    if (request.executionMode === 'takerOnly' && !this.adapter.executionCapabilities.taker) {
      throw new Error('Taker-only execution is not supported by this exchange adapter');
    }

    if (plan.mode !== 'hybrid') {
      const order = await this.adapter.placeOrder({
        ...request,
        type: plan.type,
      });

      return {
        mode: request.executionMode,
        attempts: [
          {
            type: plan.mode === 'makerOnly' ? 'maker' : 'taker',
            request: {
              ...request,
              type: plan.type,
            },
            order,
          },
        ],
        order,
      };
    }

    if (request.type === 'market') {
      const takerRequest: ExchangeOrderRequest = {
        ...request,
        executionMode: 'takerOnly',
        type: 'market',
      };

      const order = await this.adapter.placeOrder(takerRequest);

      return {
        mode: 'hybrid',
        attempts: [
          {
            type: 'taker',
            request: takerRequest,
            order,
          },
        ],
        order,
      };
    }

    const makerRequest: ExchangeOrderRequest = {
      ...request,
      executionMode: 'makerOnly',
      type: 'makerOnly',
    };

    const attempts: OrderExecutionAttempt[] = [];

    try {
      const order = await this.adapter.placeOrder(makerRequest);

      attempts.push({
        type: 'maker',
        request: makerRequest,
        order,
      });

      return {
        mode: 'hybrid',
        attempts,
        order,
      };
    } catch (error) {
      attempts.push({
        type: 'maker',
        request: makerRequest,
        error,
      });

      const takerRequest: ExchangeOrderRequest = {
        ...request,
        executionMode: 'takerOnly',
        type: 'market',
      };

      const order = await this.adapter.placeOrder(takerRequest);

      attempts.push({
        type: 'taker',
        request: takerRequest,
        order,
      });

      return {
        mode: 'hybrid',
        attempts,
        order,
      };
    }
  }
}
