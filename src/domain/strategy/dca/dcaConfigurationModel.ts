import type { BalanceModeModel } from '../../balance/balanceModeModel';
import type { StrategyInstanceModel } from '../strategyInstanceModel';
import type { StrategyModel } from '../strategyModel';
import type { ExchangeModel } from '../../exchange/exchangeModel';
import type { ExecutionModeModel } from '../../execution/executionModeModel';

export interface DcaConfigurationOrderModel {
  readonly id: string;
  readonly dcaOrderId: string;
  readonly level: number;
  readonly dropPercent: string;
}

export interface DcaConfigurationModel extends StrategyInstanceModel {
  readonly strategy: import('../strategyModel').StrategyModel;
  readonly id: string;
  readonly strategyTypeId: 'dca';
  readonly name: string;
  readonly balanceModeId: string;
  readonly exchangeId: string;
  readonly executionModeId: string;
  readonly balanceMode: BalanceModeModel;
  readonly exchange: ExchangeModel;
  readonly executionMode: ExecutionModeModel;
  readonly symbol: string;
  readonly takeProfitPercent: string;
  readonly stopLossPercent: string;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly orders: readonly DcaConfigurationOrderModel[];
}


export interface DcaConfigurationModelSelector {
  get(id: string): DcaConfigurationModel | undefined;
  getAll(): readonly DcaConfigurationModel[];
}
