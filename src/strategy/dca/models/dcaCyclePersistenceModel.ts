import type {
  DcaCycleModelRecord,
  DcaCyclePersistenceModel,
  DcaCycleStatus,
} from '../../../domain/strategy/dca/dcaCycleModel';
import { DcaCycleRepository } from '../dcaCycleRepository';

export class DcaCyclePersistenceModelImpl
  implements DcaCyclePersistenceModel
{
  constructor(private readonly repository: DcaCycleRepository) {}

  getById(id: string): DcaCycleModelRecord | undefined {
    return this.repository.getById(id);
  }

  getCurrent(configurationId: string): DcaCycleModelRecord | undefined {
    return this.repository.getCurrent(configurationId);
  }

  create(
    id: string,
    dcaConfigurationId: string,
    cycleNumber: number,
    createdAt?: string,
  ): DcaCycleModelRecord {
    return this.repository.create(
      id,
      dcaConfigurationId,
      cycleNumber,
      createdAt,
    );
  }

  setInitialEntryPrice(
    id: string,
    initialEntryPrice: string,
    updatedAt?: string,
  ): DcaCycleModelRecord {
    return this.repository.setInitialEntryPrice(
      id,
      initialEntryPrice,
      updatedAt,
    );
  }

  setEntryTotals(
    id: string,
    entryQuantity: string,
    entryQuoteQuantity: string,
    averageEntryPrice: string,
    updatedAt?: string,
  ): DcaCycleModelRecord {
    return this.repository.setEntryTotals(
      id,
      entryQuantity,
      entryQuoteQuantity,
      averageEntryPrice,
      updatedAt,
    );
  }

  updateStatus(
    id: string,
    status: DcaCycleStatus,
    updatedAt?: string,
  ): DcaCycleModelRecord {
    return this.repository.updateStatus(id, status, updatedAt);
  }
}
