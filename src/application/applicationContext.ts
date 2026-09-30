import type { DatabaseModel } from '../domain/database/databaseModel';
import { SQLiteDatabaseModelFactory } from '../domain/database/sqliteDatabaseModel';
import { ExchangeModelRegistry } from '../domain/exchange/mexcExchangeModel';
import type { ExchangeModel, ExchangeModelSelector } from '../domain/exchange/exchangeModel';
import { ExchangeBalanceModeModelRegistry } from '../domain/balance/exchangeBalanceModeModels';
import type { BalanceModeModelSelector } from '../domain/balance/balanceModeModel';
import { ExecutionModeModelRegistry } from '../domain/execution/executionModeModels';
import type { ExecutionModeModelSelector } from '../domain/execution/executionModeModel';
import { StrategyTypeModelRegistry } from '../domain/strategy/dcaStrategyTypeModel';
import type { StrategyTypeModelSelector } from '../domain/strategy/strategyTypeModel';
import { DcaStrategyService } from '../strategy/dca/dcaStrategyService';
import { ExchangeService } from '../exchange/exchangeService';

export class ApplicationContext {
  readonly database: DatabaseModel;
  readonly exchange: ExchangeModel;
  readonly exchangeModels: ExchangeModelSelector;
  readonly balanceModes: BalanceModeModelSelector;
  readonly executionModes: ExecutionModeModelSelector;
  readonly strategyTypes: StrategyTypeModelSelector;
  readonly exchanges: ExchangeService;
  readonly dcaStrategy: DcaStrategyService;

  constructor() {
    this.database = new SQLiteDatabaseModelFactory().create();

    const exchangeRegistry = new ExchangeModelRegistry(
      this.database.adapter,
    );

    this.exchangeModels = exchangeRegistry;
    this.exchange = exchangeRegistry.get('mexc');

    this.balanceModes = new ExchangeBalanceModeModelRegistry(
      this.exchange.adapter,
    );

    this.executionModes = new ExecutionModeModelRegistry();

    this.exchanges = new ExchangeService(this.database.adapter);

    this.strategyTypes = new StrategyTypeModelRegistry(
      () => this.dcaStrategy,
    );

    this.dcaStrategy = new DcaStrategyService(
      this.database.adapter,
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
