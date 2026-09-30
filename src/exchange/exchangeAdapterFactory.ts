import type { ExchangeAdapter } from './exchange';
import type { DatabaseModel } from '../domain/database/databaseModel';
import type { ExecutionModeProvider } from './order/executionModeProvider';
import { MexcExchangeAdapter } from './adapters/mexcExchangeAdapter';

export function createExchangeAdapter(
  exchangeId: string,
  db: DatabaseModel,
  executionModeProvider?: ExecutionModeProvider,
): ExchangeAdapter {
  switch (exchangeId) {
    case 'mexc':
      return new MexcExchangeAdapter(db, executionModeProvider);

    default:
      throw new Error(`Unsupported exchange: ${exchangeId}`);
  }
}
