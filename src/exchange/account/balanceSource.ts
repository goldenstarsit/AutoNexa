import type { ExchangeAccount } from '../../domain/exchange/exchangeAccount';

export interface BalanceSource {

  getAccount(): Promise<ExchangeAccount>;
}
