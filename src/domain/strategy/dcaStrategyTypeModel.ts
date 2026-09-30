import type { DcaStrategyService } from '../../strategy/dca/dcaStrategyService';
import type { StrategyTypeId, StrategyTypeModel, StrategyTypeModelSelector } from './strategyTypeModel';

export interface DcaStrategyModel extends StrategyTypeModel {
  readonly id: 'dca';
  readonly service: DcaStrategyService;
}

export class DcaStrategyTypeModel implements DcaStrategyModel {
  readonly id = 'dca' as const;
  readonly name = 'DCA';
  readonly enabled = true;

  constructor(
    private readonly strategyFactory: () => DcaStrategyService,
  ) {}

  get service(): DcaStrategyService {
    return this.strategyFactory();
  }
}

export class StrategyTypeModelRegistry implements StrategyTypeModelSelector {
  private readonly models = new Map<StrategyTypeId, StrategyTypeModel>();

  constructor(strategyFactory: () => DcaStrategyService) {
    const dca = new DcaStrategyTypeModel(strategyFactory);
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
