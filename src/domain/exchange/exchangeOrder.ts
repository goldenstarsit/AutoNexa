export type ExchangeOrderId = string;

export type ExchangeOrderSide = 'buy' | 'sell';

export type ExchangeOrderType =
  | 'market'
  | 'limit'
  | 'makerOnly';

export type ExchangeOrderExecutionMode =
  | 'makerOnly'
  | 'takerOnly'
  | 'hybrid';

export type ExchangeOrderStatus =
  | 'open'
  | 'partiallyFilled'
  | 'filled'
  | 'canceled'
  | 'partiallyCanceled'
  | 'rejected'
  | 'expired';

export interface ExchangeOrderRequest {
  symbol: string;
  side: ExchangeOrderSide;
  type: ExchangeOrderType;
  executionMode: ExchangeOrderExecutionMode;
  quantity: string;
  price?: string;
  clientOrderId?: string;
}

export interface ExchangeOrder {
  orderId: ExchangeOrderId;
  clientOrderId?: string;
  symbol: string;
  side: ExchangeOrderSide;
  type: ExchangeOrderType;
  status: ExchangeOrderStatus;
  quantity: string;
  executedQuantity: string;
  price?: string;
}
