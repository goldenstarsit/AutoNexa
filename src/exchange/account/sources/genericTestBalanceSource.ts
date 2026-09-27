import type { ExchangeAccount, ExchangeAssetBalance } from '../exchangeAccount';
import type { TestBalanceSource } from './testBalanceSource';
import {
  addDecimalAmounts,
  compareDecimalAmounts,
  subtractDecimalAmounts,
  validatePositiveDecimalAmount,
} from '../decimalAmount';

export class GenericTestBalanceSource implements TestBalanceSource {
  readonly mode = 'test' as const;

  constructor(
    private readonly balances: ExchangeAssetBalance[] = [],
  ) {}

  async getAccount(): Promise<ExchangeAccount> {
    return {
      balances: this.balances.map((balance) => ({
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
      })),
    };
  }

  deposit(
    asset: string,
    amount: string,
    _updatedAt?: string,
  ): void {
    validatePositiveDecimalAmount(amount);
    const balance = this.getOrCreateBalance(asset);

    balance.free = addDecimalAmounts(balance.free, amount);
  }

  withdraw(
    asset: string,
    amount: string,
    _updatedAt?: string,
  ): void {
    validatePositiveDecimalAmount(amount);
    const balance = this.getOrCreateBalance(asset);
    const free = balance.free;

    if (compareDecimalAmounts(amount, free) > 0) {
      throw new Error(
        `Insufficient test balance for ${asset}: requested ${amount}, available ${balance.free}`,
      );
    }

    balance.free = subtractDecimalAmounts(free, amount);
  }

  private getOrCreateBalance(asset: string): ExchangeAssetBalance {
    const existing = this.balances.find((balance) => balance.asset === asset);

    if (existing) {
      return existing;
    }

    const balance = {
      asset,
      free: '0',
      locked: '0',
    };

    this.balances.push(balance);
    return balance;
  }

}
