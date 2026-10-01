import type { ExchangeAccount } from '../../domain/exchange/exchangeAccount';

export type BalanceModeId = 'live' | 'test';

export interface BalanceSourceModel {
  getAccount(): Promise<ExchangeAccount>;
}

export interface TestBalanceOperationsModel {
  depositTestBalance(
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void;

  withdrawTestBalance(
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void;
}

export interface BalanceModeModel {
  readonly id: BalanceModeId;
  readonly name: string;
  readonly enabled: boolean;
  readonly source: BalanceSourceModel;
  readonly testOperations?: TestBalanceOperationsModel;
}

export interface BalanceModeModelSelector {
  get(id: string): BalanceModeModel;
}
