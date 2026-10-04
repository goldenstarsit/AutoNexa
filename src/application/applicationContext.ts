import type { DatabaseModel } from '../domain/database/databaseModel';
import { SQLiteDatabaseModelFactory } from '../infrastructure/database/sqliteDatabaseModel';
import { ExchangeModelRegistry } from '../infrastructure/exchange/mexcExchangeModel';
import type { ExchangeModel, ExchangeModelSelector } from '../domain/exchange/exchangeModel';
import type { BalanceModeModelSelector } from '../domain/balance/balanceModeModel';
import { ExecutionModeModelRegistry } from '../infrastructure/execution/executionModeModels';
import { ExecutionModeRepository } from '../exchange/order/executionModeRepository';
import type { ExecutionModeModelSelector } from '../domain/execution/executionModeModel';
import {
  StrategyTypeModelRegistry,
  type StrategyTypeModelSelector,
} from '../domain/strategy/strategyTypeModel';
import type { DcaStrategyTypeModelSelector } from '../domain/strategy/dcaStrategyTypeModel';
import { DcaStrategyModelRegistry } from '../strategy/dca/models/dcaStrategyModel';
import { DcaConfigurationModelSelector } from '../strategy/dca/models/dcaConfigurationModelSelector';
import { DcaConfigurationPersistenceModelImpl } from '../strategy/dca/models/dcaConfigurationPersistenceModel';
import { DcaConfigurationRepository } from '../strategy/dca/dcaConfigurationRepository';
import { DcaConfigurationService } from '../strategy/dca/dcaConfigurationService';
import type { DcaStrategyModel } from '../domain/strategy/dca/dcaStrategyModel';
import type { DcaStrategyRuntime } from '../domain/strategy/dca/dcaStrategyRuntime';
import { DcaStrategyRuntimeRunner } from './dcaStrategyRuntimeRunner';
import { DcaStrategyService } from '../strategy/dca/dcaStrategyService';
import { DcaCycleRepository } from '../strategy/dca/dcaCycleRepository';
import { DcaCyclePersistenceModelImpl } from '../strategy/dca/models/dcaCyclePersistenceModel';
import { DcaRuntimeOrderPersistenceModelImpl } from '../strategy/dca/models/dcaRuntimeOrderPersistenceModel';
import { DcaOrderRepository } from '../strategy/dca/dcaOrderRepository';
import { DcaRuntimeOrderModelSelectorImpl } from '../strategy/dca/models/dcaRuntimeOrderModelSelector';
import { DcaExitOrderPersistenceModelImpl } from '../strategy/dca/models/dcaExitOrderPersistenceModel';
import { DcaExitOrderRepository } from '../strategy/dca/dcaExitOrderRepository';
import { DcaInitialOrderRepository } from '../strategy/dca/dcaInitialOrderRepository';
import { DcaInitialOrderPersistenceModelImpl } from '../strategy/dca/models/dcaInitialOrderPersistenceModel';

export class ApplicationContext {
  readonly database: DatabaseModel;
  readonly exchange: ExchangeModel;
  readonly exchangeModels: ExchangeModelSelector;
  readonly balanceModes: BalanceModeModelSelector;
  readonly executionModes: ExecutionModeModelSelector;
  readonly strategyTypes: StrategyTypeModelSelector & DcaStrategyTypeModelSelector;
  readonly dcaStrategyModel: DcaStrategyModel;
  readonly dcaConfigurationRepository: DcaConfigurationRepository;
  readonly dcaConfigurationService: DcaConfigurationService;
  readonly dcaStrategyRuntime: DcaStrategyRuntime;
  readonly dcaStrategyRuntimeRunner: DcaStrategyRuntimeRunner;

  constructor() {
    this.database = new SQLiteDatabaseModelFactory().create();

    const executionModeProvider = new ExecutionModeRepository(this.database);

    const exchangeRegistry = new ExchangeModelRegistry(
      this.database,
      executionModeProvider,
    );

    this.exchangeModels = exchangeRegistry;
    this.exchange = exchangeRegistry.get('mexc');

    this.balanceModes = this.exchange.balanceModes;

    this.executionModes = new ExecutionModeModelRegistry(
      executionModeProvider,
    );

    const dcaStrategyModelRef: { current?: DcaStrategyModel } = {};

    const cyclePersistence = new DcaCyclePersistenceModelImpl(
      new DcaCycleRepository(this.database),
    );
    const runtimeOrderRepository = new DcaOrderRepository(this.database);
    const runtimeOrderPersistence =
      new DcaRuntimeOrderPersistenceModelImpl(runtimeOrderRepository);
    const exitOrderPersistence = new DcaExitOrderPersistenceModelImpl(
      new DcaExitOrderRepository(this.database),
    );
    const initialOrderPersistence = new DcaInitialOrderPersistenceModelImpl(
      new DcaInitialOrderRepository(this.database),
    );
    const runtimeOrderModels = new DcaRuntimeOrderModelSelectorImpl(
      runtimeOrderRepository,
    );

    const dcaStrategy = new DcaStrategyService(
      cyclePersistence,
      runtimeOrderPersistence,
      exitOrderPersistence,
      initialOrderPersistence,
      runtimeOrderModels,
      (configurationId) =>
        dcaStrategyModelRef.current!.instances.get(configurationId),
    );

    this.dcaStrategyRuntime = dcaStrategy;

    const dcaConfigurationRepository = new DcaConfigurationRepository(
      this.database,
    );
    this.dcaConfigurationRepository = dcaConfigurationRepository;
    this.dcaStrategyRuntimeRunner = new DcaStrategyRuntimeRunner(
      this.dcaStrategyRuntime,
      dcaConfigurationRepository,
      new DcaCycleRepository(this.database),
    );
    this.dcaConfigurationService = new DcaConfigurationService(
      dcaConfigurationRepository,
      new DcaCycleRepository(this.database),
    );

    const dcaConfigurationModels = new DcaConfigurationModelSelector(
      new DcaConfigurationPersistenceModelImpl(
        dcaConfigurationRepository,
      ),
      () => dcaStrategyModelRef.current!,
      this.balanceModes,
      this.exchangeModels,
      this.executionModes,
    );

    const dcaStrategyModel = new DcaStrategyModelRegistry(
      dcaConfigurationModels,
      () => dcaStrategy,
    ).get('dca');

    dcaStrategyModelRef.current = dcaStrategyModel;
    this.dcaStrategyModel = dcaStrategyModel;

    const strategyTypeRegistry = new StrategyTypeModelRegistry([
      {
        id: 'dca',
        name: 'DCA',
        enabled: true,
        strategy: dcaStrategyModel,
      },
    ]);

    this.strategyTypes = {
      get: (id: 'dca') => {
        const model = strategyTypeRegistry.get(id);
        if (model.id !== 'dca') {
          throw new Error(`Unsupported strategy type: ${id}`);
        }
        return {
          id: 'dca' as const,
          name: model.name,
          enabled: model.enabled,
          strategy: dcaStrategyModel,
        };
      },
    };
  }

  close(): void {
    this.database.close();
  }
}
