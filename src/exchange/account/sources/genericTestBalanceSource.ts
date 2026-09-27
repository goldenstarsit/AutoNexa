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
}
