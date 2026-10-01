import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { DcaStrategyRuntime } from '../../domain/strategy/dca/dcaStrategyRuntime';
import type { DcaRuntimeOrderModelSelector } from '../../domain/strategy/dca/dcaRuntimeOrderModel';
import type { DcaCyclePersistenceModel } from '../../domain/strategy/dca/dcaCycleModel';
import { DcaCycleModelSelector } from './models/dcaCycleModelSelector';
import { DcaInitialOrderService } from './dcaInitialOrderService';
import type { DcaRuntimeOrderPersistenceModel } from '../../domain/strategy/dca/dcaRuntimeOrderModel';
import { DcaOrderService } from './dcaOrderService';
import { DcaStopLossService } from './dcaStopLossService';
import type { DcaExitOrderPersistenceModel } from '../../domain/strategy/dca/dcaExitOrderModel';
import { DcaTakeProfitService } from './dcaTakeProfitService';
import {
  calculateDcaTriggerLevels,
  evaluateDcaLevels,
  type DcaLevelEvaluation,
} from './dcaTriggerPriceCalculator';

export interface DcaStrategyStartResult {
  cycleId: string;
  cycleNumber: number;
  initialOrder: Awaited<
    ReturnType<DcaInitialOrderService['startCycleAndExecute']>
  >;
}

export interface DcaStrategyProcessResult {
  cycleId: string;
  cycleNumber: number;
  currentPrice: string;
  takeProfitReached: boolean;
  stopLossReached: boolean;
  executedDcaLevels: number[];
  reachedDcaLevels: DcaLevelEvaluation[];
  nextCycle?: DcaStrategyStartResult;
}

export class DcaStrategyService implements DcaStrategyRuntime {
  private readonly cycleModels: DcaCycleModelSelector;
  private readonly initialOrderService: DcaInitialOrderService;
  private readonly orderService: DcaOrderService;
  private readonly orderRepository: DcaRuntimeOrderModelSelector;
  private readonly takeProfitService: DcaTakeProfitService;
  private readonly stopLossService: DcaStopLossService;

  constructor(
    cyclePersistence: DcaCyclePersistenceModel,
    runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel,
    exitOrderPersistence: DcaExitOrderPersistenceModel,
    orderRepository: DcaRuntimeOrderModelSelector,
    private readonly getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.cycleModels = new DcaCycleModelSelector(cyclePersistence);
    this.initialOrderService = new DcaInitialOrderService(
      cyclePersistence,
      this.getConfigurationModel,
    );
    this.orderService = new DcaOrderService(
      cyclePersistence,
      runtimeOrderPersistence,
      this.getConfigurationModel,
    );
    this.orderRepository = orderRepository;
    this.takeProfitService = new DcaTakeProfitService(
      cyclePersistence,
      exitOrderPersistence,
      this.getConfigurationModel,
    );
    this.stopLossService = new DcaStopLossService(
      cyclePersistence,
      exitOrderPersistence,
      this.getConfigurationModel,
    );
  }

  async start(configurationId: string): Promise<DcaStrategyStartResult> {
    const configuration = this.getConfigurationModel(configurationId);

    if (!configuration) {
      throw new Error(`DCA configuration not found: ${configurationId}`);
    }

    if (!configuration.enabled) {
      throw new Error(
        `DCA configuration is disabled: ${configurationId}`,
      );
    }

    const current = this.cycleModels.getCurrent(configurationId);

    if (current?.status === 'active' || current?.status === 'pending') {
      throw new Error(
        `DCA configuration already has an active cycle: ${current.id}`,
      );
    }

    const initialOrder =
      await this.initialOrderService.startCycleAndExecute(configurationId);

    return {
      cycleId: initialOrder.cycleId,
      cycleNumber: this.cycleModels.getCurrent(configurationId)?.cycleNumber ?? 0,
      initialOrder,
    };
  }

  async process(
    configurationId: string,
  ): Promise<DcaStrategyProcessResult> {
    const configuration = this.getConfigurationModel(configurationId);

    if (!configuration) {
      throw new Error(`DCA configuration not found: ${configurationId}`);
    }

    if (!configuration.enabled) {
      throw new Error(
        `DCA configuration is disabled: ${configurationId}`,
      );
    }

    const cycle = this.cycleModels.getCurrent(configurationId);

    if (!cycle || cycle.status !== 'active') {
      throw new Error(
        `DCA configuration has no active cycle: ${configurationId}`,
      );
    }

    if (!cycle.initialEntryPrice) {
      throw new Error(
        `DCA cycle has no initial entry price: ${cycle.id}`,
      );
    }

    const takeProfit = await this.takeProfitService.evaluate(
      configurationId,
    );

    if (takeProfit.reached) {
      await this.takeProfitService.execute(configurationId);
      const nextCycle = await this.start(configurationId);

      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: takeProfit.currentPrice,
        takeProfitReached: true,
        stopLossReached: false,
        executedDcaLevels: [],
        reachedDcaLevels: [],
        nextCycle,
      };
    }

    const stopLoss = await this.stopLossService.evaluate(configurationId);

    if (stopLoss.reached) {
      await this.stopLossService.execute(configurationId);
      const nextCycle = await this.start(configurationId);

      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: stopLoss.currentPrice,
        takeProfitReached: false,
        stopLossReached: true,
        executedDcaLevels: [],
        reachedDcaLevels: [],
        nextCycle,
      };
    }

    const levels = calculateDcaTriggerLevels(
      cycle.initialEntryPrice,
      [...configuration.orders],
    );

    const reachedDcaLevels = evaluateDcaLevels(
      stopLoss.currentPrice,
      levels,
    );

    const executedDcaLevels: number[] = [];

    for (const level of reachedDcaLevels) {
      if (
        !level.reached ||
        this.orderRepository.getByCycleAndLevel(
          cycle.id,
          level.level,
        )
      ) {
        continue;
      }

      await this.orderService.execute(
        await this.orderService.prepare(
          configurationId,
          cycle.id,
          level.level,
        ),
      );

      executedDcaLevels.push(level.level);
    }

    return {
      cycleId: cycle.id,
      cycleNumber: cycle.cycleNumber,
      currentPrice: stopLoss.currentPrice,
      takeProfitReached: false,
      stopLossReached: false,
      executedDcaLevels,
      reachedDcaLevels,
    };
  }
}
