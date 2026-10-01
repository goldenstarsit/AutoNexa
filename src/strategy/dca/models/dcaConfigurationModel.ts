import type {
  DcaConfigurationModel as DcaConfigurationDomainModel,
  DcaConfigurationOrderModel,
} from '../../../domain/strategy/dca/dcaConfigurationModel';
import type { BalanceModeModelSelector } from '../../../domain/balance/balanceModeModel';
import type { ExchangeModelSelector } from '../../../domain/exchange/exchangeModel';
import type { ExecutionModeModelSelector } from '../../../domain/execution/executionModeModel';
import type { DcaConfigurationRecord } from '../dcaConfigurationRepository';
import type { StrategyModel } from '../../../domain/strategy/strategyModel';

export class DcaConfigurationModel implements DcaConfigurationDomainModel {
  readonly id: string;
  readonly strategyTypeId = 'dca' as const;
  readonly strategy: StrategyModel;
  readonly name: string;
  readonly balanceModeId: string;
  readonly exchangeId: string;
  readonly executionModeId: string;
  readonly balanceMode;
  readonly exchange;
  readonly executionMode;
  readonly symbol: string;
  readonly takeProfitPercent: string;
  readonly stopLossPercent: string;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly orders: readonly DcaConfigurationOrderModel[];

  constructor(
    record: DcaConfigurationRecord,
    strategy: StrategyModel,
    balanceModes: BalanceModeModelSelector,
    exchanges: ExchangeModelSelector,
    executionModes: ExecutionModeModelSelector,
  ) {
    this.id = record.id;
    this.strategy = strategy;
    this.name = record.name;
    this.balanceModeId = record.balanceModeId;
    this.exchangeId = record.exchangeId;
    this.executionModeId = record.executionModeId;
    this.balanceMode = balanceModes.get(record.balanceModeId);
    this.exchange = exchanges.get(record.exchangeId);
    this.executionMode = executionModes.get(record.executionModeId);
    this.symbol = record.symbol;
    this.takeProfitPercent = record.takeProfitPercent;
    this.stopLossPercent = record.stopLossPercent;
    this.enabled = record.enabled;
    this.createdAt = record.createdAt;
    this.updatedAt = record.updatedAt;
    this.orders = record.orders.map((order) => ({
      id: order.id,
      dcaOrderId: order.dcaOrderId,
      level: order.level,
      dropPercent: order.dropPercent,
    }));
  }
}
