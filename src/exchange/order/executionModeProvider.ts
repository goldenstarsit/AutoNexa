import type { ExchangeOrderExecutionMode } from './exchangeOrder';

export interface ExecutionModeProvider {
  isEnabled(mode: ExchangeOrderExecutionMode): boolean;
}
