import type { ExchangeAccount } from './exchangeAccount';
import type { ExchangeBalanceMode } from './balanceMode';
import type { BalanceSource } from './balanceSource';

export interface BalanceSourceProvider {
  getSource(mode: ExchangeBalanceMode): BalanceSource;
  getAccount(mode: ExchangeBalanceMode): Promise<ExchangeAccount>;
}
