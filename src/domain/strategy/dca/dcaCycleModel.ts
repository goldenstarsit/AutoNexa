export type DcaCycleStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'stopped';

export interface DcaInitialEntryTotals {
  readonly quantity: string;
  readonly quoteQuantity: string;
  readonly averagePrice: string;
}

export interface DcaCyclePersistenceModel {
  getById(id: string): DcaCycleModelRecord | undefined;

  getCurrent(
    configurationId: string,
  ): DcaCycleModelRecord | undefined;

  create(
    id: string,
    dcaConfigurationId: string,
    cycleNumber: number,
    createdAt?: string,
  ): DcaCycleModelRecord;

  setInitialEntryPrice(
    id: string,
    initialEntryPrice: string,
    updatedAt?: string,
  ): DcaCycleModelRecord;

  setEntryTotals(
    id: string,
    entryQuantity: string,
    entryQuoteQuantity: string,
    averageEntryPrice: string,
    updatedAt?: string,
  ): DcaCycleModelRecord;

  updateStatus(
    id: string,
    status: DcaCycleStatus,
    updatedAt?: string,
  ): DcaCycleModelRecord;
}

export interface DcaCycleModelRecord {
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
}

export interface DcaCycleModel {
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

  recordInitialEntryPrice(
    entry: DcaInitialEntryTotals,
  ): DcaCycleModel;

  recordDcaEntryTotals(
    quantity: string,
    quoteQuantity: string,
    averagePrice: string,
  ): DcaCycleModel;

  complete(): DcaCycleModel;

  stop(): DcaCycleModel;
}

export interface DcaCycleModelSelector {
  get(id: string): DcaCycleModel | undefined;
  getCurrent(configurationId: string): DcaCycleModel | undefined;
  start(configurationId: string): DcaCycleModel;
}
