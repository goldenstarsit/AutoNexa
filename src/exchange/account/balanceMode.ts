export type ExchangeBalanceMode = 'live' | 'test';

export const EXCHANGE_BALANCE_MODES: ReadonlySet<string> = new Set([
  'live',
  'test',
]);
