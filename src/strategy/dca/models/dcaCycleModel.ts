import type {
  DcaCycleModel as DcaCycleDomainModel,
  DcaCycleModelRecord,
  DcaCyclePersistenceModel,
  DcaCycleStatus,
  DcaInitialEntryTotals,
} from '../../../domain/strategy/dca/dcaCycleModel';

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
    record: DcaCycleModelRecord,
    private readonly persistence: DcaCyclePersistenceModel,
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
    const cycle = this.persistence.setInitialEntryPrice(
      this.id,
      entry.averagePrice,
    );

    const updated = this.persistence.setEntryTotals(
      cycle.id,
      entry.quantity,
      entry.quoteQuantity,
      entry.averagePrice,
    );

    return new DcaCycleModel(updated, this.persistence);
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
      this.persistence.setEntryTotals(
        this.id,
        quantity,
        quoteQuantity,
        averagePrice,
      ),
      this.persistence,
    );
  }

  complete(): DcaCycleDomainModel {
    return new DcaCycleModel(
      this.persistence.updateStatus(this.id, 'completed'),
      this.persistence,
    );
  }

  stop(): DcaCycleDomainModel {
    return new DcaCycleModel(
      this.persistence.updateStatus(this.id, 'stopped'),
      this.persistence,
    );
  }
}
