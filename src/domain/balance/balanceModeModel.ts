import type { ExchangeBalanceMode } from '../../exchange/account/balanceMode';
import type { BalanceSource } from '../../exchange/account/balanceSource';
import type { TestBalanceOperations } from '../../exchange/account/testBalanceOperations';

export interface BalanceModeModel {
  readonly id: ExchangeBalanceMode;
  readonly name: string;
  readonly enabled: boolean;
  readonly source: BalanceSource;
  readonly testOperations?: TestBalanceOperations;
}

export interface BalanceModeModelSelector {
  get(id: string): BalanceModeModel;
}
