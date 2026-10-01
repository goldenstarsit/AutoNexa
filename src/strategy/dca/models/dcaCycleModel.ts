import type {
  DcaCycleModel as DcaCycleDomainModel,
  DcaCycleStatus,
  DcaInitialEntryTotals,
} from '../../../domain/strategy/dca/dcaCycleModel';
import type { DcaCycleRecord, DcaCycleRepository } from '../dcaCycleRepository';

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

  constructor(
    record: DcaCycleRecord,
    private readonly repository: DcaCycleRepository,
  ) {
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

  recordInitialEntryPrice(
    entry: DcaInitialEntryTotals,
  ): DcaCycleDomainModel {
    const cycle = this.repository.setInitialEntryPrice(
      this.id,
      entry.averagePrice,
    );

    const updated = this.repository.setEntryTotals(
      cycle.id,
      entry.quantity,
      entry.quoteQuantity,
      entry.averagePrice,
    );

    return new DcaCycleModel(updated, this.repository);
  }

  recordDcaEntryTotals(
    quantity: string,
    quoteQuantity: string,
    averagePrice: string,
  ): DcaCycleDomainModel {
    if (!this.entryQuantity || !this.entryQuoteQuantity) {
      throw new Error(
        `DCA cycle has no initial entry totals: ${this.id}`,
      );
    }

    return new DcaCycleModel(
      this.repository.setEntryTotals(
        this.id,
        quantity,
        quoteQuantity,
        averagePrice,
      ),
      this.repository,
    );
  }

  complete(): DcaCycleDomainModel {
    return new DcaCycleModel(
      this.repository.updateStatus(this.id, 'completed'),
      this.repository,
    );
  }

  stop(): DcaCycleDomainModel {
    return new DcaCycleModel(
      this.repository.updateStatus(this.id, 'stopped'),
      this.repository,
    );
  }
}
