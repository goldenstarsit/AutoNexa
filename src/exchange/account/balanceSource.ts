import type { ExchangeAccount } from './exchangeAccount';
import type { ExchangeBalanceMode } from './balanceMode';

export interface BalanceSource {
  readonly mode: ExchangeBalanceMode;

  getAccount(): Promise<ExchangeAccount>;
}
