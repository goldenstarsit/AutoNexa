import type {
  DcaConfigurationModel as DcaConfigurationDomainModel,
  DcaConfigurationModelSelector as DcaConfigurationDomainModelSelector,
  DcaConfigurationPersistenceModel,
} from '../../../domain/strategy/dca/dcaConfigurationModel';
import type { BalanceModeModelSelector } from '../../../domain/balance/balanceModeModel';
import type { ExchangeModelSelector } from '../../../domain/exchange/exchangeModel';
import type { ExecutionModeModelSelector } from '../../../domain/execution/executionModeModel';
import type { StrategyModel } from '../../../domain/strategy/strategyModel';
import { DcaConfigurationModel } from './dcaConfigurationModel';

export class DcaConfigurationModelSelector
  implements DcaConfigurationDomainModelSelector
{
  constructor(
    private readonly persistence: DcaConfigurationPersistenceModel,
    private readonly getStrategy: () => StrategyModel,
    private readonly balanceModes: BalanceModeModelSelector,
    private readonly exchanges: ExchangeModelSelector,
    private readonly executionModes: ExecutionModeModelSelector,
  ) {}

  get(id: string): DcaConfigurationDomainModel | undefined {
    const record = this.persistence.getById(id);

    return record
      ? new DcaConfigurationModel(
          record,
          this.getStrategy(),
          this.balanceModes,
          this.exchanges,
          this.executionModes,
        )
      : undefined;
  }

  getAll(): readonly DcaConfigurationDomainModel[] {
    return this.persistence.getAll().map(
      (record) =>
        new DcaConfigurationModel(
          record,
          this.getStrategy(),
          this.balanceModes,
          this.exchanges,
          this.executionModes,
        ),
    );
  }
}
