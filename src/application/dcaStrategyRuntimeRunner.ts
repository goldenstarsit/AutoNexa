import type { DcaStrategyRuntime } from '../domain/strategy/dca/dcaStrategyRuntime';
import type { DcaConfigurationRepository } from '../strategy/dca/dcaConfigurationRepository';
import type { DcaCycleRepository } from '../strategy/dca/dcaCycleRepository';

export interface DcaStrategyRuntimeRunnerOptions {
  readonly intervalMs: number;
}

export class DcaStrategyRuntimeRunner {
  private readonly runningConfigurations = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;
  private stopped = true;

  constructor(
    private readonly runtime: DcaStrategyRuntime,
    private readonly configurationRepository: DcaConfigurationRepository,
    private readonly cycleRepository: DcaCycleRepository,
    private readonly options: DcaStrategyRuntimeRunnerOptions = {
      intervalMs: 1000,
    },
  ) {}

  start(): void {
    if (!this.stopped) return;

    this.stopped = false;
    void this.tick();

    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.intervalMs);
  }

  stop(): void {
    this.stopped = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async tick(): Promise<void> {
    if (this.stopped) return;

    for (const configuration of this.configurationRepository.getAll()) {
      if (!configuration.enabled) continue;
      if (this.runningConfigurations.has(configuration.id)) continue;

      this.runningConfigurations.add(configuration.id);

      void this.runConfiguration(configuration.id).finally(() => {
        this.runningConfigurations.delete(configuration.id);
      });
    }
  }

  private async runConfiguration(configurationId: string): Promise<void> {
    try {
      const configuration =
        this.configurationRepository.getById(configurationId);

      if (!configuration?.enabled) return;

      const cycle = this.cycleRepository.getCurrent(configurationId);

      if (
        !cycle ||
        cycle.status === 'completed' ||
        cycle.status === 'stopped'
      ) {
        await this.runtime.start(configurationId);
        return;
      }

      await this.runtime.process(configurationId);
    } catch (error) {
      console.error(
        `[DcaStrategyRuntimeRunner] ${configurationId}:`,
        error instanceof Error ? error.message : error,
        error instanceof Error && 'data' in error
          ? (error as Error & { data?: unknown }).data
          : undefined,
      );
    }
  }
}
