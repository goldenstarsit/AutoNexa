import type { ExchangeAccount } from '../exchangeAccount';
import type { BalanceSource } from '../balanceSource';

export interface LiveBalanceSource extends BalanceSource {
  readonly mode: 'live';
  getAccount(): Promise<ExchangeAccount>;
}
