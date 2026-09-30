import type { DatabaseModel } from '../domain/database/databaseModel';
import { SQLiteDatabaseModelFactory } from '../domain/database/sqliteDatabaseModel';
import { ExchangeModelRegistry } from '../domain/exchange/mexcExchangeModel';
import type { ExchangeModel, ExchangeModelSelector } from '../domain/exchange/exchangeModel';
import { ExchangeBalanceModeModelRegistry } from '../domain/balance/exchangeBalanceModeModels';
import type { BalanceModeModelSelector } from '../domain/balance/balanceModeModel';
import { ExecutionModeModelRegistry } from '../domain/execution/executionModeModels';
import { ExecutionModeRepository } from '../exchange/order/executionModeRepository';
import type { ExecutionModeModelSelector } from '../domain/execution/executionModeModel';
import { StrategyTypeModelRegistry } from '../domain/strategy/dcaStrategyTypeModel';
import { DcaStrategyModelRegistry } from '../strategy/dca/models/dcaStrategyModel';
import type { DcaStrategyModel } from '../domain/strategy/dca/dcaStrategyModel';
import type { StrategyTypeModelSelector } from '../domain/strategy/strategyTypeModel';
import { DcaStrategyService } from '../strategy/dca/dcaStrategyService';

export class ApplicationContext {
  readonly database: DatabaseModel;
  readonly exchange: ExchangeModel;
  readonly exchangeModels: ExchangeModelSelector;
  readonly balanceModes: BalanceModeModelSelector;
  readonly executionModes: ExecutionModeModelSelector;
  readonly strategyTypes: StrategyTypeModelSelector;
  readonly dcaStrategyModel: DcaStrategyModel;
  readonly dcaStrategy: DcaStrategyService;

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


    this.dcaStrategyModel = new DcaStrategyModelRegistry(
      this.database,
      this.balanceModes,
      this.exchangeModels,
      this.executionModes,
      () => this.dcaStrategy,
    ).get('dca');

    this.strategyTypes = new StrategyTypeModelRegistry(
      () => this.dcaStrategyModel,
    );

    this.dcaStrategy = new DcaStrategyService(
      this.database,
      this.strategyTypes,
      this.balanceModes,
      this.exchangeModels,
      this.executionModes,
    );
  }

  close(): void {
    this.database.close();
  }
}
