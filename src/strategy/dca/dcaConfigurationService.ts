import type { DcaConfigurationRepository } from './dcaConfigurationRepository';
import type { DcaCycleRepository } from './dcaCycleRepository';

export interface DcaRuntimeConfigurationInput {
  balanceModeId: string;
  executionModeId: string;
  takeProfitPercent: string;
  stopLossPercent: string;
  enabled: boolean;
  dropPercents: readonly string[];
}

export class DcaConfigurationService {
  constructor(
    private readonly configurationRepository: DcaConfigurationRepository,
    private readonly cycleRepository: DcaCycleRepository,
  ) {}

  update(
    configurationId: string,
    input: DcaRuntimeConfigurationInput,
  ): void {
    const configuration =
      this.configurationRepository.getById(configurationId);

    if (!configuration) {
      throw new Error(
        `DCA configuration not found: ${configurationId}`,
      );
    }

    const currentCycle =
      this.cycleRepository.getCurrent(configurationId);

    if (
      currentCycle &&
      (currentCycle.status === 'active' ||
        currentCycle.status === 'pending')
    ) {
      throw new Error(
        `Cannot update DCA configuration while cycle is ${currentCycle.status}: ${currentCycle.id}`,
      );
    }

    if (!input.balanceModeId.trim()) {
      throw new Error('Balance mode is required');
    }

    if (!input.executionModeId.trim()) {
      throw new Error('Execution mode is required');
    }

    const takeProfitPercent = Number(input.takeProfitPercent);
    if (!Number.isFinite(takeProfitPercent) || takeProfitPercent < 0) {
      throw new Error('Take profit percent must be a non-negative number');
    }

    const stopLossPercent = Number(input.stopLossPercent);
    if (!Number.isFinite(stopLossPercent) || stopLossPercent < 0) {
      throw new Error('Stop loss percent must be a non-negative number');
    }

    if (stopLossPercent > 100) {
      throw new Error('Stop loss percent cannot exceed 100');
    }

    if (input.dropPercents.length === 0) {
      throw new Error('At least one DCA drop level is required');
    }

    const drops = input.dropPercents.map((value) => Number(value));

    if (
      drops.some(
        (value) => !Number.isFinite(value) || value <= 0 || value >= 100,
      )
    ) {
      throw new Error(
        'DCA drop percents must be greater than 0 and less than 100',
      );
    }

    for (let index = 1; index < drops.length; index += 1) {
      if (drops[index] <= drops[index - 1]) {
        throw new Error(
          'DCA drop percents must be strictly increasing',
        );
      }
    }

    this.configurationRepository.updateRuntimeConfiguration(
      configurationId,
      {
        balanceModeId: input.balanceModeId,
        executionModeId: input.executionModeId,
        takeProfitPercent: input.takeProfitPercent,
        stopLossPercent: input.stopLossPercent,
        enabled: input.enabled,
        dropPercents: input.dropPercents,
      },
    );
  }
}
