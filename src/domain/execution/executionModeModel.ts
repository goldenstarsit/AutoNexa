import type { ExchangeOrderExecutionMode } from '../../exchange/order/exchangeOrder';

export interface ExecutionModeModel {
  readonly id: ExchangeOrderExecutionMode;
  readonly name: string;
  readonly enabled: boolean;
  execute<T>(operation: {
    maker: () => Promise<T>;
    taker: () => Promise<T>;
  }): Promise<T>;
}

export interface ExecutionModeModelSelector {
  get(id: string): ExecutionModeModel;
}
