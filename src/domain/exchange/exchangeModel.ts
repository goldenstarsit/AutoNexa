import type { ExchangeAccount } from '../../domain/exchange/exchangeAccount';
import type {
  BalanceModeId,
  BalanceModeModel,
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

  getTradingRules(
    symbol: string,
  ): Promise<ExchangeTradingRules | undefined>;

  getCurrentPrice(symbol: string): Promise<string>;

  getAccount(
    mode?: BalanceModeId,
  ): Promise<ExchangeAccount>;

  placeOrder(
    request: ExchangeOrderRequest,
    mode?: BalanceModeId,
  ): Promise<ExchangeOrder>;

  getOrderTrades(
    symbol: string,
    orderId: string,
    mode?: BalanceModeId,
  ): Promise<ExchangeTrade[]>;

  depositTestBalance: TestBalanceOperationsModel['depositTestBalance'];
  withdrawTestBalance: TestBalanceOperationsModel['withdrawTestBalance'];
}

export interface ExchangeModelSelector {
  get(id: ExchangeId): ExchangeModel;
}
