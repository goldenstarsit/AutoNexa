import type { ExchangeAdapter, ExchangeId } from '../../exchange/exchange';
import type { ExchangeTradingRules } from '../../exchange/market/exchangeTradingRules';

export interface ExchangeModel {
  readonly id: ExchangeId;
  readonly name: string;
  readonly enabled: boolean;
  readonly adapter: ExchangeAdapter;
  getTradingRules(symbol: string): Promise<ExchangeTradingRules | undefined>;
  getCurrentPrice(symbol: string): Promise<string>;
}

export interface ExchangeModelSelector {
  get(id: ExchangeId): ExchangeModel;
}
