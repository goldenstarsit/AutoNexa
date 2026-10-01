export type DcaCycleStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'stopped';

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
}

export interface DcaCycleModelSelector {
  get(id: string): DcaCycleModel | undefined;
  getCurrent(configurationId: string): DcaCycleModel | undefined;
}
