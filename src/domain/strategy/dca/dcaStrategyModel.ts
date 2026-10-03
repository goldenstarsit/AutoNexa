import type { StrategyModel, StrategyModelSelector } from '../strategyModel';
import type {
  DcaConfigurationModel,
  DcaConfigurationModelSelector,
} from './dcaConfigurationModel';
import type {
  DcaStrategyRuntime,
  DcaStrategyStartResult,
  DcaStrategyProcessResult,
} from './dcaStrategyRuntime';

export interface DcaStrategyModel extends StrategyModel {
  readonly id: 'dca';
  readonly strategyTypeId: 'dca';
  readonly instances: DcaConfigurationModelSelector;

  getConfiguration(id: string): DcaConfigurationModel | undefined;
  getConfigurations(): readonly DcaConfigurationModel[];

  start(configurationId: string): Promise<DcaStrategyStartResult>;
  process(configurationId: string): Promise<DcaStrategyProcessResult>;
  stop(configurationId: string): Promise<{
    cycleId: string;
    cycleNumber: number;
  }>;
}

export interface DcaStrategyModelSelector extends StrategyModelSelector {
  get(id: string): DcaStrategyModel;
}

export type DcaStrategyRuntimeFactory = () => DcaStrategyRuntime;
