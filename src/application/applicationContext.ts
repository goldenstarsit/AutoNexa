import type { DatabaseModel } from '../domain/database/databaseModel';
import { SQLiteDatabaseModelFactory } from '../infrastructure/database/sqliteDatabaseModel';
import { ExchangeModelRegistry } from '../infrastructure/exchange/mexcExchangeModel';
import type { ExchangeModel, ExchangeModelSelector } from '../domain/exchange/exchangeModel';
import { ExchangeBalanceModeModelRegistry } from '../infrastructure/balance/exchangeBalanceModeModels';
import type { BalanceModeModelSelector } from '../domain/balance/balanceModeModel';
import { ExecutionModeModelRegistry } from '../infrastructure/execution/executionModeModels';
import { ExecutionModeRepository } from '../exchange/order/executionModeRepository';
import type { ExecutionModeModelSelector } from '../domain/execution/executionModeModel';
import {
  StrategyTypeModelRegistry,
  type DcaStrategyTypeModelSelector,
} from '../domain/strategy/dcaStrategyTypeModel';
import { DcaStrategyModelRegistry } from '../strategy/dca/models/dcaStrategyModel';
import type { DcaStrategyModel } from '../domain/strategy/dca/dcaStrategyModel';
import { DcaStrategyService } from '../strategy/dca/dcaStrategyService';

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

    this.balanceModes = new ExchangeBalanceModeModelRegistry(
      this.exchange,
    );

    this.executionModes = new ExecutionModeModelRegistry(
      executionModeProvider,
    );


    let dcaStrategyModel: DcaStrategyModel;

    const dcaStrategy = new DcaStrategyService(
      this.database,
      (configurationId) =>
        dcaStrategyModel.getConfiguration(configurationId),
    );

    dcaStrategyModel = new DcaStrategyModelRegistry(
      this.database,
      this.balanceModes,
      this.exchangeModels,
      this.executionModes,
      () => dcaStrategy,
    ).get('dca');

    this.dcaStrategyModel = dcaStrategyModel;

    this.strategyTypes = new StrategyTypeModelRegistry(
      dcaStrategyModel,
    );
  }

  close(): void {
    this.database.close();
  }
}
