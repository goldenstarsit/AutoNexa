import type { ExchangeAccount, ExchangeAssetBalance } from '../exchangeAccount';
import type { TestBalanceSource } from './testBalanceSource';

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
    const value = this.parseAmount(amount);
    const balance = this.getOrCreateBalance(asset);

    balance.free = this.formatAmount(
      this.toNumber(balance.free) + value,
    );
  }

  withdraw(
    asset: string,
    amount: string,
    _updatedAt?: string,
  ): void {
    const value = this.parseAmount(amount);
    const balance = this.getOrCreateBalance(asset);
    const free = this.toNumber(balance.free);

    if (value > free) {
      throw new Error(
        `Insufficient test balance for ${asset}: requested ${amount}, available ${balance.free}`,
      );
    }

    balance.free = this.formatAmount(free - value);
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

  private parseAmount(amount: string): number {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid balance amount: ${amount}`);
    }

    return value;
  }

  private toNumber(amount: string): number {
    const value = Number(amount);

    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid stored balance: ${amount}`);
    }

    return value;
  }

  private formatAmount(amount: number): string {
    return amount.toString();
  }
}
