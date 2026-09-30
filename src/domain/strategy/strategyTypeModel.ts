export type StrategyTypeId = string;

export interface StrategyTypeModel {
  readonly id: StrategyTypeId;
  readonly name: string;
  readonly enabled: boolean;
}

export interface StrategyTypeModelSelector {
  get(id: StrategyTypeId): StrategyTypeModel;
}
