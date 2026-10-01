import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import {
  DcaCycleRepository,
  type DcaCycleRecord,
} from './dcaCycleRepository';

export interface DcaInitialEntryTotals {
  quantity: string;
  quoteQuantity: string;
  averagePrice: string;
}

export class DcaCycleService {
  private readonly getConfigurationModel: (
    configurationId: string,
  ) => DcaConfigurationModel | undefined;
  private readonly repository: DcaCycleRepository;

  constructor(
    private readonly db: DatabaseModel,
    getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.getConfigurationModel = getConfigurationModel;
    this.repository = new DcaCycleRepository(db);
  }

  startCycle(configurationId: string): DcaCycleRecord {
    const configuration =
      this.getConfigurationModel(configurationId);

    if (!configuration) {
      throw new Error(
        `DCA configuration not found: ${configurationId}`,
      );
    }

    if (!configuration.enabled) {
      throw new Error(
        `DCA configuration is disabled: ${configurationId}`,
      );
    }

    const current = this.repository.getCurrent(configurationId);
    const cycleNumber = current ? current.cycleNumber + 1 : 1;

    return this.repository.create(
      `${configurationId}-cycle-${cycleNumber}`,
      configurationId,
      cycleNumber,
    );
  }

  getCurrent(
    configurationId: string,
  ): DcaCycleRecord | undefined {
    return this.repository.getCurrent(configurationId);
  }

  recordInitialEntryPrice(
    cycleId: string,
    entry: DcaInitialEntryTotals,
  ): DcaCycleRecord {
    return this.repository.setInitialEntryPrice(
      cycleId,
      entry.averagePrice,
    ).id
      ? this.repository.setEntryTotals(
          cycleId,
          entry.quantity,
          entry.quoteQuantity,
          entry.averagePrice,
        )
      : this.repository.setInitialEntryPrice(
          cycleId,
          entry.averagePrice,
        );
  }

  recordDcaEntryTotals(
    cycleId: string,
    quantity: string,
    quoteQuantity: string,
    averagePrice: string,
  ): DcaCycleRecord {
    const cycle = this.repository.getById(cycleId);

    if (!cycle) {
      throw new Error(`DCA cycle not found: ${cycleId}`);
    }

    if (!cycle.entryQuantity || !cycle.entryQuoteQuantity) {
      throw new Error(
        `DCA cycle has no initial entry totals: ${cycleId}`,
      );
    }

    return this.repository.setEntryTotals(
      cycleId,
      quantity,
      quoteQuantity,
      averagePrice,
    );
  }

  completeCycle(cycleId: string): DcaCycleRecord {
    return this.repository.updateStatus(cycleId, 'completed');
  }

  stopCycle(cycleId: string): DcaCycleRecord {
    return this.repository.updateStatus(cycleId, 'stopped');
  }
}
