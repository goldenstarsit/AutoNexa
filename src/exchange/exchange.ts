import type { ExchangeAccount } from './account/exchangeAccount';
import type { TestBalanceOperations } from './account/testBalanceOperations';
import type { ExchangeBalanceMode } from './account/balanceMode';
import type { ExchangeOrder, ExchangeOrderRequest } from './order/exchangeOrder';
import type { ExchangeSymbolInfo } from './market/exchangeMarket';
import type { ExchangeTradingRules } from './market/exchangeTradingRules';
import type { ExchangeCapabilities } from './exchangeCapabilities';
import type { ExchangeHealth } from './exchangeHealth';

export type ExchangeId = string;

export interface ExchangeConfig {
  id: ExchangeId;
  name: string;
  enabled: boolean;
}

export interface ExchangeAdapter extends TestBalanceOperations {
  readonly id: ExchangeId;
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccount(mode?: ExchangeBalanceMode): Promise<ExchangeAccount>;
  placeOrder(request: ExchangeOrderRequest): Promise<ExchangeOrder>;
  getOrder(symbol: string, orderId: string): Promise<ExchangeOrder>;
  cancelOrder(symbol: string, orderId: string): Promise<ExchangeOrder>;
  getOpenOrders(symbol?: string): Promise<ExchangeOrder[]>;
  getOrderHistory(
    symbol: string,
    options?: {
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<ExchangeOrder[]>;
  getSymbolInfo(symbol: string): Promise<ExchangeSymbolInfo | undefined>;
  getSymbols(): Promise<ExchangeSymbolInfo[]>;
  getTradingRules(symbol: string): Promise<ExchangeTradingRules | undefined>;
  getCurrentPrice(symbol: string): Promise<string>;
  getCapabilities(): Promise<ExchangeCapabilities>;
  getHealth(): Promise<ExchangeHealth>;
}
