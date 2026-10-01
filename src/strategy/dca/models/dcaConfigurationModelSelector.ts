import type {
  DcaConfigurationModel as DcaConfigurationDomainModel,
  DcaConfigurationModelSelector as DcaConfigurationDomainModelSelector,
} from '../../../domain/strategy/dca/dcaConfigurationModel';
import type { BalanceModeModelSelector } from '../../../domain/balance/balanceModeModel';
import type { ExchangeModelSelector } from '../../../domain/exchange/exchangeModel';
import type { ExecutionModeModelSelector } from '../../../domain/execution/executionModeModel';
import type { StrategyModel } from '../../../domain/strategy/strategyModel';
import { DcaConfigurationRepository } from '../dcaConfigurationRepository';
import { DcaConfigurationModel } from './dcaConfigurationModel';

export class DcaConfigurationModelSelector
  implements DcaConfigurationDomainModelSelector
{
  constructor(
    private readonly repository: DcaConfigurationRepository,
    private readonly getStrategy: () => StrategyModel,
    private readonly balanceModes: BalanceModeModelSelector,
    private readonly exchanges: ExchangeModelSelector,
    private readonly executionModes: ExecutionModeModelSelector,
  ) {}

  get(id: string): DcaConfigurationDomainModel | undefined {
    const record = this.repository.getById(id);

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
    return this.repository.getAll().map(
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
