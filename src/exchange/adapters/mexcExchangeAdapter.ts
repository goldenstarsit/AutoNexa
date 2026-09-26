import type { ExchangeAdapter } from '../exchange';
import type { ExchangeAccount } from '../account/exchangeAccount';
import { MexcAccountApi } from './mexc/mexcAccountApi';
import { MexcPrivateApiClient } from './mexc/mexcPrivateApiClient';

export class MexcExchangeAdapter implements ExchangeAdapter {
  readonly id = 'mexc';
  readonly name = 'MEXC';

  private readonly accountApi = new MexcAccountApi(
    new MexcPrivateApiClient(),
  );

  async connect(): Promise<void> {
    // Connection lifecycle will be expanded in the MEXC integration milestone.
  }

  async disconnect(): Promise<void> {
    // Connection cleanup will be expanded in the MEXC integration milestone.
  }

  async getAccount(): Promise<ExchangeAccount> {
    return this.accountApi.getAccount();
  }
}
