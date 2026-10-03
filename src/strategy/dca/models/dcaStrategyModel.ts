import type {
  DcaStrategyModel as DcaStrategyDomainModel,
  DcaStrategyModelSelector as DcaStrategyDomainModelSelector,
  DcaStrategyRuntimeFactory,
} from '../../../domain/strategy/dca/dcaStrategyModel';
import type {
  DcaConfigurationModel as DcaConfigurationDomainModel,
  DcaConfigurationModelSelector,
} from '../../../domain/strategy/dca/dcaConfigurationModel';

export class DcaStrategyModel implements DcaStrategyDomainModel {
  readonly id = 'dca' as const;
  readonly strategyTypeId = 'dca' as const;
  readonly name = 'DCA';
  readonly enabled = true;

  readonly instances: DcaConfigurationModelSelector = {
    get: (id) => this.getConfiguration(id),
    getAll: () => this.getConfigurations(),
  };

  constructor(
    private readonly configurationModels: DcaConfigurationModelSelector,
    private readonly runtimeFactory: DcaStrategyRuntimeFactory,
  ) {}

  getConfiguration(id: string): DcaConfigurationDomainModel | undefined {
    return this.configurationModels.get(id);
  }

  getConfigurations(): readonly DcaConfigurationDomainModel[] {
    return this.configurationModels.getAll();
  }

  async start(configurationId: string) {
    return this.runtimeFactory().start(configurationId);
  }

  async process(configurationId: string) {
    return this.runtimeFactory().process(configurationId);
  }

  async stop(configurationId: string) {
    return this.runtimeFactory().stop(configurationId);
  }
}

export class DcaStrategyModelRegistry
  implements DcaStrategyDomainModelSelector
{
  private readonly model: DcaStrategyModel;

  constructor(
    configurationModels: DcaConfigurationModelSelector,
    runtimeFactory: DcaStrategyRuntimeFactory,
  ) {
    this.model = new DcaStrategyModel(
      configurationModels,
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
