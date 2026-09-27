import type { ExchangeAccount } from '../exchangeAccount';
import type { LiveBalanceSource } from './liveBalanceSource';
import type { MexcAccountApi } from '../../adapters/mexc/mexcAccountApi';

export class MexcLiveBalanceSource implements LiveBalanceSource {
  readonly mode = 'live' as const;

  constructor(private readonly accountApi: MexcAccountApi) {}

  async getAccount(): Promise<ExchangeAccount> {
    return this.accountApi.getAccount();
  }
}
