import type { ExchangeAccount } from '../domain/exchange/exchangeAccount';
import type { TestBalanceOperations } from './account/testBalanceOperations';
import type { ExchangeBalanceMode } from './account/balanceMode';
import type { ExchangeOrder, ExchangeOrderRequest } from '../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../domain/exchange/exchangeTrade';
import type { ExchangeSymbolInfo } from './market/exchangeMarket';
import type { ExchangeTradingRules } from '../domain/exchange/exchangeTradingRules';
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
  placeOrder(request: ExchangeOrderRequest, mode?: ExchangeBalanceMode): Promise<ExchangeOrder>;
  getOrder(symbol: string, orderId: string): Promise<ExchangeOrder>;
  getOrderTrades(symbol: string, orderId: string, mode?: ExchangeBalanceMode): Promise<ExchangeTrade[]>;
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
  getBestBidPrice(symbol: string): Promise<string>;
  getBestAskPrice(symbol: string): Promise<string>;
  getCapabilities(): Promise<ExchangeCapabilities>;
  getHealth(): Promise<ExchangeHealth>;
}
