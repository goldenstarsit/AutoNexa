import type {
  DcaCycleModel as DcaCycleDomainModel,
  DcaCycleModelSelector as DcaCycleDomainModelSelector,
  DcaCyclePersistenceModel,
} from '../../../domain/strategy/dca/dcaCycleModel';
import { DcaCycleModel } from './dcaCycleModel';

export class DcaCycleModelSelector
  implements DcaCycleDomainModelSelector
{
  constructor(private readonly persistence: DcaCyclePersistenceModel) {}

  get(id: string): DcaCycleDomainModel | undefined {
    const record = this.persistence.getById(id);

    return record
      ? new DcaCycleModel(record, this.persistence)
      : undefined;
  }

  getCurrent(configurationId: string): DcaCycleDomainModel | undefined {
    const record = this.persistence.getCurrent(configurationId);

    return record
      ? new DcaCycleModel(record, this.persistence)
      : undefined;
  }

  start(configurationId: string): DcaCycleDomainModel {
    const current = this.persistence.getCurrent(configurationId);
    const cycleNumber = current ? current.cycleNumber + 1 : 1;

    const record = this.persistence.create(
      `${configurationId}-cycle-${cycleNumber}`,
      configurationId,
      cycleNumber,
    );

    return new DcaCycleModel(record, this.persistence);
  }
}
