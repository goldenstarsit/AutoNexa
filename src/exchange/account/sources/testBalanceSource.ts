import type { ExchangeAccount } from '../exchangeAccount';
import type { BalanceSource } from '../balanceSource';

export interface TestBalanceSource extends BalanceSource {
  readonly mode: 'test';

  getAccount(): Promise<ExchangeAccount>;

  deposit(
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void;

  withdraw(
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void;
}
