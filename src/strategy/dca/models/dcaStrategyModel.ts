import type {
  DcaStrategyModel as DcaStrategyDomainModel,
  DcaStrategyRuntimeFactory,
} from '../../../domain/strategy/dca/dcaStrategyModel';
import type { DcaConfigurationModel as DcaConfigurationDomainModel } from '../../../domain/strategy/dca/dcaConfigurationModel';
import type { BalanceModeModelSelector } from '../../../domain/balance/balanceModeModel';
import type { ExchangeModelSelector } from '../../../domain/exchange/exchangeModel';
import type { ExecutionModeModelSelector } from '../../../domain/execution/executionModeModel';
import type { DatabaseModel } from '../../../domain/database/databaseModel';
import type { StrategyInstanceModelSelector } from '../../../domain/strategy/strategyInstanceModel';
import { DcaConfigurationRepository } from '../dcaConfigurationRepository';
import { DcaConfigurationModel } from './dcaConfigurationModel';

export class DcaStrategyModel implements DcaStrategyDomainModel {
  readonly id = 'dca' as const;
  readonly strategyTypeId = 'dca' as const;
  readonly name = 'DCA';
  readonly enabled = true;
  readonly instances: StrategyInstanceModelSelector = {
    get: (id) => this.getConfiguration(id),
    getAll: () => this.getConfigurations(),
  };

  private readonly repository: DcaConfigurationRepository;

  constructor(
    db: DatabaseModel,
    private readonly balanceModes: BalanceModeModelSelector,
    private readonly exchanges: ExchangeModelSelector,
    private readonly executionModes: ExecutionModeModelSelector,
    private readonly runtimeFactory: DcaStrategyRuntimeFactory,
  ) {
    this.repository = new DcaConfigurationRepository(db);
  }

  getConfiguration(id: string): DcaConfigurationDomainModel | undefined {
    const record = this.repository.getById(id);

    return record
      ? new DcaConfigurationModel(
          record,
          this,
          this.balanceModes,
          this.exchanges,
          this.executionModes,
        )
      : undefined;
  }


  async start(configurationId: string) {
    return this.runtimeFactory().start(configurationId);
  }

  async process(configurationId: string) {
    return this.runtimeFactory().process(configurationId);
  }

  getConfigurations(): readonly DcaConfigurationDomainModel[] {
    return this.repository.getAll().map(
      (record) =>
        new DcaConfigurationModel(
          record,
          this,
          this.balanceModes,
          this.exchanges,
          this.executionModes,
        ),
    );
  }
}

export class DcaStrategyModelRegistry {
  private readonly model: DcaStrategyModel;

  constructor(
    db: DatabaseModel,
    balanceModes: BalanceModeModelSelector,
    exchanges: ExchangeModelSelector,
    executionModes: ExecutionModeModelSelector,
    runtimeFactory: DcaStrategyRuntimeFactory,
  ) {
    this.model = new DcaStrategyModel(
      db,
      balanceModes,
      exchanges,
      executionModes,
      runtimeFactory,
    );
  }

  get(id: string): DcaStrategyModel {
    if (id !== this.model.id) {
      throw new Error(`Unsupported strategy model: ${id}`);
    }

    if (!this.model.enabled) {
      throw new Error(`Strategy model is disabled: ${id}`);
    }

    return this.model;
  }
}
