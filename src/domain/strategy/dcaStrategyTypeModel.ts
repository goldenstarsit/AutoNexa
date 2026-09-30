import type {
  StrategyTypeId,
  StrategyTypeModel,
  StrategyTypeModelSelector,
} from './strategyTypeModel';
import type { DcaStrategyModel } from './dca/dcaStrategyModel';

export interface DcaStrategyTypeModel extends StrategyTypeModel {
  readonly id: 'dca';
  readonly strategy: DcaStrategyModel;
}

export class DcaStrategyTypeModelImpl implements DcaStrategyTypeModel {
  readonly id = 'dca' as const;
  readonly name = 'DCA';
  readonly enabled = true;

  constructor(readonly strategy: DcaStrategyModel) {}
}

export class StrategyTypeModelRegistry implements StrategyTypeModelSelector {
  private readonly models = new Map<StrategyTypeId, StrategyTypeModel>();

  constructor(dcaStrategy: DcaStrategyModel | (() => DcaStrategyModel)) {
    const strategy =
      typeof dcaStrategy === 'function' ? dcaStrategy() : dcaStrategy;

    const dca = new DcaStrategyTypeModelImpl(strategy);
    this.models.set(dca.id, dca);
  }

  get(id: StrategyTypeId): StrategyTypeModel {
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
