import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeAccount, ExchangeAssetBalance } from './exchangeAccount';
import { TestBalanceRepository } from './testBalanceRepository';
import type { TestBalanceSource } from './sources/testBalanceSource';

export class TestBalanceService implements TestBalanceSource {
  readonly mode = 'test' as const;

  private readonly repository: TestBalanceRepository;

  constructor(
    db: DatabaseAdapter,
    private readonly exchangeId: string,
  ) {
    this.repository = new TestBalanceRepository(db);
  }

  async getAccount(): Promise<ExchangeAccount> {
    return {
      balances: this.repository.getAll(this.exchangeId),
    };
  }

  getBalance(asset: string): ExchangeAssetBalance | undefined {
    return this.repository.get(this.exchangeId, asset);
  }

  deposit(
    asset: string,
    amount: string,
    updatedAt: string = new Date().toISOString(),
  ): void {
    const value = this.parseAmount(amount);

    const current = this.repository.get(this.exchangeId, asset);
    const free = this.toNumber(current?.free ?? '0') + value;

    this.repository.upsert(
      this.exchangeId,
      {
        asset,
        free: this.formatAmount(free),
        locked: current?.locked ?? '0',
      },
      updatedAt,
    );
  }

  withdraw(
    asset: string,
    amount: string,
    updatedAt: string = new Date().toISOString(),
  ): void {
    const value = this.parseAmount(amount);
    const current = this.repository.get(this.exchangeId, asset);
    const free = this.toNumber(current?.free ?? '0');

    if (value > free) {
      throw new Error(
        `Insufficient test balance for ${asset}: requested ${amount}, available ${current?.free ?? '0'}`,
      );
    }

    this.repository.upsert(
      this.exchangeId,
      {
        asset,
        free: this.formatAmount(free - value),
        locked: current?.locked ?? '0',
      },
      updatedAt,
    );
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
