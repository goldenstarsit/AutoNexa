import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeAccount, ExchangeAssetBalance } from './exchangeAccount';
import { TestBalanceRepository } from './testBalanceRepository';
import type { TestBalanceSource } from './sources/testBalanceSource';
import {
  addDecimalAmounts,
  compareDecimalAmounts,
  subtractDecimalAmounts,
  validatePositiveDecimalAmount,
} from './decimalAmount';

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
    validatePositiveDecimalAmount(amount);

    const current = this.repository.get(this.exchangeId, asset);
    const free = addDecimalAmounts(current?.free ?? '0', amount);

    this.repository.upsert(
      this.exchangeId,
      {
        asset,
        free,
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
    validatePositiveDecimalAmount(amount);
    const current = this.repository.get(this.exchangeId, asset);
    const free = current?.free ?? '0';

    if (compareDecimalAmounts(amount, free) > 0) {
      throw new Error(
        `Insufficient test balance for ${asset}: requested ${amount}, available ${current?.free ?? '0'}`,
      );
    }

    this.repository.upsert(
      this.exchangeId,
      {
        asset,
        free: subtractDecimalAmounts(free, amount),
        locked: current?.locked ?? '0',
      },
      updatedAt,
    );
  }

}
