import type {
  DcaCycleModel as DcaCycleDomainModel,
  DcaCycleModelSelector as DcaCycleDomainModelSelector,
} from '../../../domain/strategy/dca/dcaCycleModel';
import type { DcaCycleRepository } from '../dcaCycleRepository';
import { DcaCycleModel } from './dcaCycleModel';

export class DcaCycleModelSelector
  implements DcaCycleDomainModelSelector
{
  constructor(private readonly repository: DcaCycleRepository) {}

  get(id: string): DcaCycleDomainModel | undefined {
    const record = this.repository.getById(id);

    return record
      ? new DcaCycleModel(record, this.repository)
      : undefined;
  }

  getCurrent(configurationId: string): DcaCycleDomainModel | undefined {
    const record = this.repository.getCurrent(configurationId);

    return record
      ? new DcaCycleModel(record, this.repository)
      : undefined;
  }

  start(configurationId: string): DcaCycleDomainModel {
    const current = this.repository.getCurrent(configurationId);
    const cycleNumber = current ? current.cycleNumber + 1 : 1;

    const record = this.repository.create(
      `${configurationId}-cycle-${cycleNumber}`,
      configurationId,
      cycleNumber,
    );

    return new DcaCycleModel(record, this.repository);
  }
}
