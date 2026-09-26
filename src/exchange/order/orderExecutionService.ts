import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from './exchangeOrder';
import { createOrderExecutionPlan } from './orderExecution';

export interface OrderExecutionAdapter {
  placeOrder(request: ExchangeOrderRequest): Promise<ExchangeOrder>;
}

export class OrderExecutionService {
  constructor(private readonly adapter: OrderExecutionAdapter) {}

  async execute(request: ExchangeOrderRequest): Promise<ExchangeOrder> {
    const plan = createOrderExecutionPlan(request);

    return this.adapter.placeOrder({
      ...request,
      type: plan.type,
    });
  }
}
