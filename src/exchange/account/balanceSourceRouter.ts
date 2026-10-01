import type { ExchangeAccount } from '../../domain/exchange/exchangeAccount';
import type { ExchangeBalanceMode } from './balanceMode';
import type { BalanceSource } from './balanceSource';

export class BalanceSourceRouter {
  constructor(
    private readonly sources: ReadonlyMap<ExchangeBalanceMode, BalanceSource>,
  ) {}

  getSource(mode: ExchangeBalanceMode): BalanceSource {
    const source = this.sources.get(mode);

    if (!source) {
      throw new Error(`Balance source not configured for mode: ${mode}`);
    }

    return source;
  }

  async getAccount(mode: ExchangeBalanceMode): Promise<ExchangeAccount> {
    return this.getSource(mode).getAccount();
  }
}
