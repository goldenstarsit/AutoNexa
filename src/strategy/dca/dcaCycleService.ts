import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { DcaCycleModel as DcaCycleDomainModel } from '../../domain/strategy/dca/dcaCycleModel';
import {
  DcaCycleRepository,
} from './dcaCycleRepository';
import { DcaCycleModel } from './models/dcaCycleModel';

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

  startCycle(configurationId: string): DcaCycleDomainModel {
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

    return new DcaCycleModel(
      this.repository.create(
        `${configurationId}-cycle-${cycleNumber}`,
        configurationId,
        cycleNumber,
      ),
    );
  }

  getCurrent(
    configurationId: string,
  ): DcaCycleDomainModel | undefined {
    const cycle = this.repository.getCurrent(configurationId);
    return cycle ? new DcaCycleModel(cycle) : undefined;
  }

  recordInitialEntryPrice(
    cycleId: string,
    entry: DcaInitialEntryTotals,
  ): DcaCycleDomainModel {
    const cycle = this.repository.setInitialEntryPrice(
      cycleId,
      entry.averagePrice,
    );

    const updated = this.repository.setEntryTotals(
      cycle.id,
      entry.quantity,
      entry.quoteQuantity,
      entry.averagePrice,
    );

    return new DcaCycleModel(updated);
  }

  recordDcaEntryTotals(
    cycleId: string,
    quantity: string,
    quoteQuantity: string,
    averagePrice: string,
  ): DcaCycleDomainModel {
    const cycle = this.repository.getById(cycleId);

    if (!cycle) {
      throw new Error(`DCA cycle not found: ${cycleId}`);
    }

    if (!cycle.entryQuantity || !cycle.entryQuoteQuantity) {
      throw new Error(
        `DCA cycle has no initial entry totals: ${cycleId}`,
      );
    }

    return new DcaCycleModel(
      this.repository.setEntryTotals(
        cycleId,
        quantity,
        quoteQuantity,
        averagePrice,
      ),
    );
  }

  completeCycle(cycleId: string): DcaCycleDomainModel {
    return new DcaCycleModel(
      this.repository.updateStatus(cycleId, 'completed'),
    );
  }

  stopCycle(cycleId: string): DcaCycleDomainModel {
    return new DcaCycleModel(
      this.repository.updateStatus(cycleId, 'stopped'),
    );
  }
}
