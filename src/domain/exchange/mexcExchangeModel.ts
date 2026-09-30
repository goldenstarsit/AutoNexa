import type { DatabaseModel } from '../database/databaseModel';
import { MexcExchangeAdapter } from '../../exchange/adapters/mexcExchangeAdapter';
import type { ExchangeId } from './exchangeModel';
import type { ExecutionModeProvider } from '../execution/executionModeProvider';
import type { ExchangeModel, ExchangeModelSelector } from './exchangeModel';

export class MexcExchangeModel implements ExchangeModel {
  readonly id: ExchangeId = 'mexc';
  readonly name = 'MEXC';
  readonly enabled = true;

  private readonly adapter: MexcExchangeAdapter;

  constructor(
    db: DatabaseModel,
    executionModeProvider?: ExecutionModeProvider,
  ) {
    this.adapter = new MexcExchangeAdapter(db, executionModeProvider);
  }

  placeOrder(
    request: Parameters<MexcExchangeAdapter['placeOrder']>[0],
    mode?: Parameters<MexcExchangeAdapter['placeOrder']>[1],
  ) {
    return this.adapter.placeOrder(request, mode);
  }

  getOrderTrades(
    symbol: Parameters<MexcExchangeAdapter['getOrderTrades']>[0],
    orderId: Parameters<MexcExchangeAdapter['getOrderTrades']>[1],
    mode?: Parameters<MexcExchangeAdapter['getOrderTrades']>[2],
  ) {
    return this.adapter.getOrderTrades(symbol, orderId, mode);
  }

  getTradingRules(symbol: string) {
    return this.adapter.getTradingRules(symbol);
  }

  getCurrentPrice(symbol: string) {
    return this.adapter.getCurrentPrice(symbol);
  }

  getAccount(mode?: 'live' | 'test') {
    return this.adapter.getAccount(mode);
  }

  depositTestBalance(asset: string, amount: string) {
    return this.adapter.depositTestBalance(asset, amount);
  }

  withdrawTestBalance(asset: string, amount: string) {
    return this.adapter.withdrawTestBalance(asset, amount);
  }
}

export class ExchangeModelRegistry implements ExchangeModelSelector {
  private readonly models = new Map<ExchangeId, ExchangeModel>();

  constructor(
    db: DatabaseModel,
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
