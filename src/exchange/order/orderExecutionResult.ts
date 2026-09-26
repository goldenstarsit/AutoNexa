import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from './exchangeOrder';

export type OrderExecutionAttemptType = 'maker' | 'taker';

export interface OrderExecutionAttempt {
  type: OrderExecutionAttemptType;
  request: ExchangeOrderRequest;
  order?: ExchangeOrder;
  error?: unknown;
}

export interface OrderExecutionResult {
  mode: ExchangeOrderRequest['executionMode'];
  attempts: OrderExecutionAttempt[];
  order?: ExchangeOrder;
}
