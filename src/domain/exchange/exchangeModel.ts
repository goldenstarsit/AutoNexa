import type { ExchangeAccount } from '../../domain/exchange/exchangeAccount';
import type {
  BalanceModeId,
  BalanceModeModelSelector,
  TestBalanceOperationsModel,
} from '../balance/balanceModeModel';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../domain/exchange/exchangeOrder';
import type { ExchangeTrade } from '../../domain/exchange/exchangeTrade';
import type { ExchangeTradingRules } from '../../domain/exchange/exchangeTradingRules';

export type ExchangeId = string;

export interface ExchangeModel {
  readonly id: ExchangeId;
  readonly name: string;
  readonly enabled: boolean;
  readonly balanceModes: BalanceModeModelSelector;

  getSymbolInfo(symbol: string): Promise<import('../../exchange/market/exchangeMarket').ExchangeSymbolInfo | undefined>;
  getTradingRules(
    symbol: string,
  ): Promise<ExchangeTradingRules | undefined>;

  getCurrentPrice(symbol: string): Promise<string>;

  getBestBidPrice(symbol: string): Promise<string>;

  getBestAskPrice(symbol: string): Promise<string>;

  getAccount(
    mode?: BalanceModeId,
  ): Promise<ExchangeAccount>;

  placeOrder(
    request: ExchangeOrderRequest,
    mode?: BalanceModeId,
  ): Promise<ExchangeOrder>;
  getOrder(
    symbol: string,
    orderId: string,
    mode?: BalanceModeId,
  ): Promise<ExchangeOrder>;

  getOrderTrades(
    symbol: string,
    orderId: string,
    mode?: BalanceModeId,
  ): Promise<ExchangeTrade[]>;

  getOrderHistory?: (
    symbol: string,
    options?: {
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
    mode?: BalanceModeId,
  ) => Promise<ExchangeOrder[]>;

  depositTestBalance: TestBalanceOperationsModel['depositTestBalance'];
  withdrawTestBalance: TestBalanceOperationsModel['withdrawTestBalance'];
}

export interface ExchangeModelSelector {
  get(id: ExchangeId): ExchangeModel;
}
