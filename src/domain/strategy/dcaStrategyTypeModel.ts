import type {
  StrategyTypeModel,
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

export interface DcaStrategyTypeModelSelector {
  get(id: 'dca'): DcaStrategyTypeModel;
}
