import type { StrategyModel } from './strategyModel';

export interface StrategyInstanceModel {
  readonly id: string;
  readonly strategy: StrategyModel;
  readonly enabled: boolean;
}

export interface StrategyInstanceModelSelector {
  get(id: string): StrategyInstanceModel | undefined;
  getAll(): readonly StrategyInstanceModel[];
}
