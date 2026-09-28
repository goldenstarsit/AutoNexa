import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { DcaConfigurationRepository, type DcaConfigurationRecord } from './dcaConfigurationRepository';

export class DcaConfigurationService {
  private readonly repository: DcaConfigurationRepository;

  constructor(private readonly db: DatabaseAdapter) {
    this.repository = new DcaConfigurationRepository(db);
  }

  getAll(): DcaConfigurationRecord[] {
    return this.repository.getAll().map((configuration) =>
      this.validateConfiguration(configuration),
    );
  }

  getById(id: string): DcaConfigurationRecord | undefined {
    const configuration = this.repository.getById(id);

    if (!configuration) {
      return undefined;
    }

    return this.validateConfiguration(configuration);
  }

  getBySymbol(symbol: string): DcaConfigurationRecord | undefined {
    const configuration = this.repository.getBySymbol(symbol);

    if (!configuration) {
      return undefined;
    }

    return this.validateConfiguration(configuration);
  }

  getEnabled(): DcaConfigurationRecord[] {
    return this.getAll().filter((configuration) => configuration.enabled);
  }

  private validateConfiguration(
    configuration: DcaConfigurationRecord,
  ): DcaConfigurationRecord {
    if (configuration.strategyTypeId !== 'dca') {
      throw new Error(
        `Invalid DCA configuration strategy type: ${configuration.strategyTypeId}`,
      );
    }

    const balanceMode = this.db.get<{ enabled: number }>(
      `
        SELECT enabled
        FROM balance_modes
        WHERE id = ?
      `,
      configuration.balanceModeId,
    );

    if (!balanceMode) {
      throw new Error(
        `Balance mode not found: ${configuration.balanceModeId}`,
      );
    }

    if (balanceMode.enabled !== 1) {
      throw new Error(
        `Balance mode is disabled: ${configuration.balanceModeId}`,
      );
    }

    const exchange = this.db.get<{ enabled: number }>(
      `
        SELECT enabled
        FROM exchanges
        WHERE id = ?
      `,
      configuration.exchangeId,
    );

    if (!exchange) {
      throw new Error(`Exchange not found: ${configuration.exchangeId}`);
    }

    if (exchange.enabled !== 1) {
      throw new Error(`Exchange is disabled: ${configuration.exchangeId}`);
    }

    const executionMode = this.db.get<{ enabled: number }>(
      `
        SELECT enabled
        FROM execution_modes
        WHERE id = ?
      `,
      configuration.executionModeId,
    );

    if (!executionMode) {
      throw new Error(
        `Execution mode not found: ${configuration.executionModeId}`,
      );
    }

    if (executionMode.enabled !== 1) {
      throw new Error(
        `Execution mode is disabled: ${configuration.executionModeId}`,
      );
    }

    if (configuration.orders.length === 0) {
      throw new Error(
        `DCA configuration has no DCA orders: ${configuration.id}`,
      );
    }

    return configuration;
  }
}
