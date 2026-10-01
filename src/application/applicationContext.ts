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
  type DcaStrategyTypeModelSelector,
} from '../domain/strategy/dcaStrategyTypeModel';
import { DcaStrategyModelRegistry } from '../strategy/dca/models/dcaStrategyModel';
import { DcaConfigurationModelSelector } from '../strategy/dca/models/dcaConfigurationModelSelector';
import { DcaConfigurationPersistenceModelImpl } from '../strategy/dca/models/dcaConfigurationPersistenceModel';
import { DcaConfigurationRepository } from '../strategy/dca/dcaConfigurationRepository';
import type { DcaStrategyModel } from '../domain/strategy/dca/dcaStrategyModel';
import { DcaStrategyService } from '../strategy/dca/dcaStrategyService';
import { DcaCycleRepository } from '../strategy/dca/dcaCycleRepository';
import { DcaCyclePersistenceModelImpl } from '../strategy/dca/models/dcaCyclePersistenceModel';
import { DcaRuntimeOrderPersistenceModelImpl } from '../strategy/dca/models/dcaRuntimeOrderPersistenceModel';
import { DcaOrderRepository } from '../strategy/dca/dcaOrderRepository';
import { DcaRuntimeOrderModelSelectorImpl } from '../strategy/dca/models/dcaRuntimeOrderModelSelector';
import { DcaExitOrderPersistenceModelImpl } from '../strategy/dca/models/dcaExitOrderPersistenceModel';
import { DcaExitOrderRepository } from '../strategy/dca/dcaExitOrderRepository';

export class ApplicationContext {
  readonly database: DatabaseModel;
  readonly exchange: ExchangeModel;
  readonly exchangeModels: ExchangeModelSelector;
  readonly balanceModes: BalanceModeModelSelector;
  readonly executionModes: ExecutionModeModelSelector;
  readonly strategyTypes: DcaStrategyTypeModelSelector;
  readonly dcaStrategyModel: DcaStrategyModel;

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
    const runtimeOrderModels = new DcaRuntimeOrderModelSelectorImpl(
      runtimeOrderRepository,
    );

    const dcaStrategy = new DcaStrategyService(
      cyclePersistence,
      runtimeOrderPersistence,
      exitOrderPersistence,
      runtimeOrderModels,
      (configurationId) =>
        dcaStrategyModelRef.current!.instances.get(configurationId),
    );

    const dcaConfigurationModels = new DcaConfigurationModelSelector(
      new DcaConfigurationPersistenceModelImpl(
        new DcaConfigurationRepository(this.database),
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

    this.strategyTypes = new StrategyTypeModelRegistry(
      dcaStrategyModel,
    );
  }

  close(): void {
    this.database.close();
  }
}
