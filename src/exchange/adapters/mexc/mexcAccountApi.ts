import type { ExchangeAccount } from '../../account/exchangeAccount';
import { MexcPrivateApiClient } from './mexcPrivateApiClient';

export interface MexcAccountResponse {
  accountType: string;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

export class MexcAccountApi {
  constructor(
    private readonly privateApiClient: MexcPrivateApiClient,
  ) {}

  async getAccount(): Promise<ExchangeAccount> {
    const response =
      await this.privateApiClient.request<MexcAccountResponse>(
        'GET',
        '/api/v3/account',
      );

    return {
      balances: response.balances.map((balance) => ({
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
      })),
    };
  }
}
