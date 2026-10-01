import type {
  DcaCycleModel as DcaCycleDomainModel,
  DcaCycleStatus,
} from '../../../domain/strategy/dca/dcaCycleModel';
import type { DcaCycleRecord } from '../dcaCycleRepository';

export class DcaCycleModel implements DcaCycleDomainModel {
  readonly id: string;
  readonly dcaConfigurationId: string;
  readonly cycleNumber: number;
  readonly status: DcaCycleStatus;
  readonly initialEntryPrice?: string;
  readonly entryQuantity?: string;
  readonly entryQuoteQuantity?: string;
  readonly averageEntryPrice?: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(record: DcaCycleRecord) {
    this.id = record.id;
    this.dcaConfigurationId = record.dcaConfigurationId;
    this.cycleNumber = record.cycleNumber;
    this.status = record.status;
    this.initialEntryPrice = record.initialEntryPrice;
    this.entryQuantity = record.entryQuantity;
    this.entryQuoteQuantity = record.entryQuoteQuantity;
    this.averageEntryPrice = record.averageEntryPrice;
    this.createdAt = record.createdAt;
    this.updatedAt = record.updatedAt;
  }
}
