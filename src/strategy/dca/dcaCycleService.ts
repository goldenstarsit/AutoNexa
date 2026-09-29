import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { DcaConfigurationService } from './dcaConfigurationService';
import {
  DcaCycleRepository,
  type DcaCycleRecord,
} from './dcaCycleRepository';

export class DcaCycleService {
  private readonly configurationService: DcaConfigurationService;
  private readonly repository: DcaCycleRepository;

  constructor(private readonly db: DatabaseAdapter) {
    this.configurationService = new DcaConfigurationService(db);
    this.repository = new DcaCycleRepository(db);
  }

  startCycle(configurationId: string): DcaCycleRecord {
    const configuration =
      this.configurationService.getById(configurationId);

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
    initialEntryPrice: string,
  ): DcaCycleRecord {
    return this.repository.setInitialEntryPrice(
      cycleId,
      initialEntryPrice,
    );
  }

  completeCycle(cycleId: string): DcaCycleRecord {
    return this.repository.updateStatus(cycleId, 'completed');
  }

  stopCycle(cycleId: string): DcaCycleRecord {
    return this.repository.updateStatus(cycleId, 'stopped');
  }
}
