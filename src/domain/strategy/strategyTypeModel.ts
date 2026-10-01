import type { StrategyModel } from './strategyModel';

export type StrategyTypeId = string;

export interface StrategyTypeModel {
  readonly id: StrategyTypeId;
  readonly name: string;
  readonly enabled: boolean;
  readonly strategy: StrategyModel;
}

export interface StrategyTypeModelSelector {
  get(id: StrategyTypeId): StrategyTypeModel;
}
