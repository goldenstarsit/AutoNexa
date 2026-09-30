import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { BalanceModeModelSelector } from '../../domain/balance/balanceModeModel';
import type { ExchangeModelSelector } from '../../domain/exchange/exchangeModel';
import type { ExecutionModeModelSelector } from '../../domain/execution/executionModeModel';
import type { StrategyTypeModelSelector } from '../../domain/strategy/strategyTypeModel';
import {
  DcaConfigurationRepository,
  type DcaConfigurationRecord,
} from './dcaConfigurationRepository';

export class DcaConfigurationService {
  private readonly repository: DcaConfigurationRepository;

  constructor(
    private readonly db: DatabaseAdapter,
    private readonly strategyTypes: StrategyTypeModelSelector,
    private readonly balanceModes: BalanceModeModelSelector,
    private readonly exchanges: ExchangeModelSelector,
    private readonly executionModes: ExecutionModeModelSelector,
  ) {
    this.repository = new DcaConfigurationRepository(db);
  }

  updateRuntimeSettings(
    id: string,
    balanceModeId: 'live' | 'test',
    enabled: boolean,
  ): DcaConfigurationRecord {
    const configuration = this.repository.getById(id);

    if (!configuration) {
      throw new Error(`DCA configuration not found: ${id}`);
    }

    this.balanceModes.get(balanceModeId);

    if (enabled && configuration.enabled) {
      throw new Error(
        `DCA configuration is already enabled: ${id}`,
      );
    }

    this.repository.updateRuntimeSettings(
      id,
      balanceModeId,
      enabled,
    );

    const updated = this.repository.getById(id);

    if (!updated) {
      throw new Error(
        `DCA configuration not found after update: ${id}`,
      );
    }

    return updated;
  }

  getAll(): DcaConfigurationRecord[] {
    return this.repository
      .getAll()
      .map((configuration) => this.validateConfiguration(configuration));
  }

  getById(id: string): DcaConfigurationRecord | undefined {
    const configuration = this.repository.getById(id);

    if (!configuration) {
      return undefined;
    }

    return this.validateConfiguration(configuration);
  }

  getBySymbol(
    symbol: string,
  ): DcaConfigurationRecord | undefined {
    const configuration = this.repository.getBySymbol(symbol);

    if (!configuration) {
      return undefined;
    }

    return this.validateConfiguration(configuration);
  }

  getEnabled(): DcaConfigurationRecord[] {
    return this.getAll().filter(
      (configuration) => configuration.enabled,
    );
  }

  private validateConfiguration(
    configuration: DcaConfigurationRecord,
  ): DcaConfigurationRecord {
    const strategyType = this.strategyTypes.get(
      configuration.strategyTypeId,
    );

    if (strategyType.id !== 'dca') {
      throw new Error(
        `Invalid DCA configuration strategy type: ${configuration.strategyTypeId}`,
      );
    }

    this.balanceModes.get(configuration.balanceModeId);
    this.exchanges.get(configuration.exchangeId);
    this.executionModes.get(configuration.executionModeId);

    if (configuration.orders.length === 0) {
      throw new Error(
        `DCA configuration has no DCA orders: ${configuration.id}`,
      );
    }

    return configuration;
  }
}
