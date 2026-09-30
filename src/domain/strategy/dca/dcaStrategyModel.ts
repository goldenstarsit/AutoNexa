import type { StrategyModel, StrategyModelSelector } from '../strategyModel';
import type { DcaConfigurationModel } from './dcaConfigurationModel';
import type {
  DcaStrategyRuntime,
  DcaStrategyStartResult,
  DcaStrategyProcessResult,
} from './dcaStrategyRuntime';

export interface DcaStrategyModel extends StrategyModel {
  readonly id: 'dca';
  readonly strategyTypeId: 'dca';

  getConfiguration(id: string): DcaConfigurationModel | undefined;
  getConfigurations(): readonly DcaConfigurationModel[];

  start(configurationId: string): Promise<DcaStrategyStartResult>;
  process(configurationId: string): Promise<DcaStrategyProcessResult>;
}

export interface DcaStrategyModelSelector extends StrategyModelSelector {
  get(id: string): DcaStrategyModel;
}

export type DcaStrategyRuntimeFactory = () => DcaStrategyRuntime;
