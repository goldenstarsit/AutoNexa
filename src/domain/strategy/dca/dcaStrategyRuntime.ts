export interface DcaStrategyStartResult {
  readonly cycleId: string;
  readonly cycleNumber: number;
  readonly initialOrder: unknown;
}

export interface DcaStrategyProcessResult {
  readonly cycleId: string;
  readonly cycleNumber: number;
  readonly currentPrice: string;
  readonly takeProfitReached: boolean;
  readonly stopLossReached: boolean;
  readonly executedDcaLevels: readonly number[];
  readonly reachedDcaLevels: readonly unknown[];
}

export interface DcaStrategyRuntime {
  start(configurationId: string): Promise<DcaStrategyStartResult>;
  process(configurationId: string): Promise<DcaStrategyProcessResult>;
}
