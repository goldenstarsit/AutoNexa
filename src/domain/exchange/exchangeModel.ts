import type { ExchangeAdapter, ExchangeId } from '../../exchange/exchange';
import type { ExchangeTradingRules } from '../../exchange/market/exchangeTradingRules';
import type { TestBalanceOperations } from '../../exchange/account/testBalanceOperations';

export interface ExchangeModel {
  readonly id: ExchangeId;
  readonly name: string;
  readonly enabled: boolean;
  readonly adapter: ExchangeAdapter;
  getTradingRules(symbol: string): Promise<ExchangeTradingRules | undefined>;
  getCurrentPrice(symbol: string): Promise<string>;
  getAccount(
    mode?: 'live' | 'test',
  ): ReturnType<ExchangeAdapter['getAccount']>;
  depositTestBalance(
    asset: string,
    amount: string,
  ): ReturnType<TestBalanceOperations['depositTestBalance']>;
  withdrawTestBalance(
    asset: string,
    amount: string,
  ): ReturnType<TestBalanceOperations['withdrawTestBalance']>;
}

export interface ExchangeModelSelector {
  get(id: ExchangeId): ExchangeModel;
}
