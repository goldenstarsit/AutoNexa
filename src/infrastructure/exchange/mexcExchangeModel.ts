import type { DatabaseModel } from '../../domain/database/databaseModel';
import { ExchangeBalanceModeModelRegistry } from '../balance/exchangeBalanceModeModels';
import { MexcExchangeAdapter } from '../../exchange/adapters/mexcExchangeAdapter';
import type { BalanceModeModelSelector } from '../../domain/balance/balanceModeModel';
import type { ExchangeId } from '../../domain/exchange/exchangeModel';
import type { ExecutionModeProvider } from '../../domain/execution/executionModeProvider';
import type { ExchangeModel, ExchangeModelSelector } from '../../domain/exchange/exchangeModel';

export class MexcExchangeModel implements ExchangeModel {
  readonly id: ExchangeId = 'mexc';
  readonly name = 'MEXC';
  readonly enabled = true;
  readonly balanceModes: BalanceModeModelSelector;

  private readonly adapter: MexcExchangeAdapter;

  constructor(
    db: DatabaseModel,
    executionModeProvider?: ExecutionModeProvider,
  ) {
    this.adapter = new MexcExchangeAdapter(db, executionModeProvider);
    this.balanceModes = new ExchangeBalanceModeModelRegistry(this);
  }

  placeOrder(
    request: Parameters<MexcExchangeAdapter['placeOrder']>[0],
    mode?: Parameters<MexcExchangeAdapter['placeOrder']>[1],
  ) {
    return this.adapter.placeOrder(request, mode);
  }

  getOrder(
    symbol: Parameters<MexcExchangeAdapter['getOrder']>[0],
    orderId: Parameters<MexcExchangeAdapter['getOrder']>[1],
    mode?: Parameters<ExchangeModel['getOrder']>[2],
  ) {
    return this.adapter.getOrder(symbol, orderId, mode);
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

  getBestBidPrice(symbol: string) {
    return this.adapter.getBestBidPrice(symbol);
  }

  getBestAskPrice(symbol: string) {
    return this.adapter.getBestAskPrice(symbol);
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
