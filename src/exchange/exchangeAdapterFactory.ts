import type { ExchangeAdapter } from './exchange';
import type { ExecutionModeProvider } from './order/executionModeProvider';
import { MexcExchangeAdapter } from './adapters/mexcExchangeAdapter';

export function createExchangeAdapter(
  exchangeId: string,
  executionModeProvider?: ExecutionModeProvider,
): ExchangeAdapter {
  switch (exchangeId) {
    case 'mexc':
      return new MexcExchangeAdapter(executionModeProvider);

    default:
      throw new Error(`Unsupported exchange: ${exchangeId}`);
  }
}
