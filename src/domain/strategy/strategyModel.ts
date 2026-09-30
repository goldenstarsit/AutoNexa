import type { StrategyTypeId } from './strategyTypeModel';

export interface StrategyModel {
  readonly id: string;
  readonly strategyTypeId: StrategyTypeId;
  readonly name: string;
  readonly enabled: boolean;
}

export interface StrategyModelSelector {
  get(id: string): StrategyModel;
}
