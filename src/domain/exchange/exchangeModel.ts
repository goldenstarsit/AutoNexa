import type { ExchangeAccount } from '../../exchange/account/exchangeAccount';
import type { ExchangeBalanceMode } from '../../exchange/account/balanceMode';
import type { TestBalanceOperations } from '../../exchange/account/testBalanceOperations';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../exchange/order/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/trade/exchangeTrade';
import type { ExchangeTradingRules } from '../../exchange/market/exchangeTradingRules';

export type ExchangeId = string;

export interface ExchangeModel {
  readonly id: ExchangeId;
  readonly name: string;
  readonly enabled: boolean;

  getTradingRules(
    symbol: string,
  ): Promise<ExchangeTradingRules | undefined>;

  getCurrentPrice(symbol: string): Promise<string>;

  getAccount(
    mode?: ExchangeBalanceMode,
  ): Promise<ExchangeAccount>;

  placeOrder(
    request: ExchangeOrderRequest,
    mode?: ExchangeBalanceMode,
  ): Promise<ExchangeOrder>;

  getOrderTrades(
    symbol: string,
    orderId: string,
    mode?: ExchangeBalanceMode,
  ): Promise<ExchangeTrade[]>;

  depositTestBalance: TestBalanceOperations['depositTestBalance'];
  withdrawTestBalance: TestBalanceOperations['withdrawTestBalance'];
}

export interface ExchangeModelSelector {
  get(id: ExchangeId): ExchangeModel;
}
