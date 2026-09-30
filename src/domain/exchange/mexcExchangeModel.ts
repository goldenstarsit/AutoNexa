import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { MexcExchangeAdapter } from '../../exchange/adapters/mexcExchangeAdapter';
import type { ExchangeId } from '../../exchange/exchange';
import type { ExecutionModeProvider } from '../../exchange/order/executionModeProvider';
import type { ExchangeModel, ExchangeModelSelector } from './exchangeModel';

export class MexcExchangeModel implements ExchangeModel {
  readonly id: ExchangeId = 'mexc';
  readonly name = 'MEXC';
  readonly enabled = true;

  readonly adapter: MexcExchangeAdapter;

  constructor(
    db: DatabaseAdapter,
    executionModeProvider?: ExecutionModeProvider,
  ) {
    this.adapter = new MexcExchangeAdapter(db, executionModeProvider);
  }

  getTradingRules(symbol: string) {
    return this.adapter.getTradingRules(symbol);
  }

  getCurrentPrice(symbol: string) {
    return this.adapter.getCurrentPrice(symbol);
  }
}

export class ExchangeModelRegistry implements ExchangeModelSelector {
  private readonly models = new Map<ExchangeId, ExchangeModel>();

  constructor(
    db: DatabaseAdapter,
    executionModeProvider?: ExecutionModeProvider,
  ) {
    const mexc = new MexcExchangeModel(db, executionModeProvider);
    this.models.set(mexc.id, mexc);
  }

  get(id: ExchangeId): ExchangeModel {
    const model = this.models.get(id);

    if (!model) {
      throw new Error(`Unsupported exchange model: ${id}`);
    }

    if (!model.enabled) {
      throw new Error(`Exchange model is disabled: ${id}`);
    }

    return model;
  }
}
