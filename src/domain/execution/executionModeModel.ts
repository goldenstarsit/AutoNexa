export type ExecutionModeId =
  | 'makerOnly'
  | 'takerOnly'
  | 'hybrid';

export interface ExecutionModeModel {
  readonly id: ExecutionModeId;
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
