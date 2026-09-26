import type { ExchangeAccount } from './account/exchangeAccount';
import type { ExchangeOrder, ExchangeOrderRequest } from './order/exchangeOrder';

export type ExchangeId = string;

export interface ExchangeConfig {
  id: ExchangeId;
  name: string;
  enabled: boolean;
}

export interface ExchangeAdapter {
  readonly id: ExchangeId;
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccount(): Promise<ExchangeAccount>;
  placeOrder(request: ExchangeOrderRequest): Promise<ExchangeOrder>;
  getOrder(symbol: string, orderId: string): Promise<ExchangeOrder>;
  cancelOrder(symbol: string, orderId: string): Promise<ExchangeOrder>;
}
