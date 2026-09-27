import type { ExchangeAccount } from './exchangeAccount';

export interface BalanceSource {

  getAccount(): Promise<ExchangeAccount>;
}
