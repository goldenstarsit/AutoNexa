import type { ExchangeBalanceMode } from './balanceMode';

export interface BalanceModeProvider {
  isEnabled(mode: ExchangeBalanceMode): boolean;
}
