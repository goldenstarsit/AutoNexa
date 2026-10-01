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

export class StrategyTypeModelRegistry implements StrategyTypeModelSelector {
  private readonly models = new Map<string, StrategyTypeModel>();

  constructor(models: readonly StrategyTypeModel[]) {
    for (const model of models) {
      this.models.set(model.id, model);
    }
  }

  get(id: string): StrategyTypeModel {
    const model = this.models.get(id);

    if (!model) {
      throw new Error(`Unsupported strategy type: ${id}`);
    }

    if (!model.enabled) {
      throw new Error(`Strategy type is disabled: ${id}`);
    }

    return model;
  }
}
