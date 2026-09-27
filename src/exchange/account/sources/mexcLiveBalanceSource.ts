import type { ExchangeAccount } from '../exchangeAccount';
import type { BalanceSource } from '../balanceSource';
import type { MexcAccountApi } from '../../adapters/mexc/mexcAccountApi';

export class MexcLiveBalanceSource implements BalanceSource {
  readonly mode = 'live' as const;

  constructor(private readonly accountApi: MexcAccountApi) {}

  async getAccount(): Promise<ExchangeAccount> {
    return this.accountApi.getAccount();
  }
}
