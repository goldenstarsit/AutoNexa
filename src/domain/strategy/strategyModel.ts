import type { StrategyTypeId } from './strategyTypeModel';
import type { StrategyInstanceModelSelector } from './strategyInstanceModel';

export interface StrategyModel {
  readonly id: string;
  readonly strategyTypeId: StrategyTypeId;
  readonly name: string;
  readonly enabled: boolean;
  readonly instances: StrategyInstanceModelSelector;
}

export interface StrategyModelSelector {
  get(id: string): StrategyModel;
}
