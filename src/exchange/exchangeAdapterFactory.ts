import type { ExchangeAdapter } from './exchange';
import { MexcExchangeAdapter } from './adapters/mexcExchangeAdapter';

export function createExchangeAdapter(exchangeId: string): ExchangeAdapter {
  switch (exchangeId) {
    case 'mexc':
      return new MexcExchangeAdapter();

    default:
      throw new Error(`Unsupported exchange: ${exchangeId}`);
  }
}
