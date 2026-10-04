import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { DcaStrategyRuntime } from '../../domain/strategy/dca/dcaStrategyRuntime';
import type { DcaRuntimeOrderModelSelector } from '../../domain/strategy/dca/dcaRuntimeOrderModel';
import type { DcaCyclePersistenceModel } from '../../domain/strategy/dca/dcaCycleModel';
import { DcaCycleModelSelector } from './models/dcaCycleModelSelector';
import { DcaInitialOrderService } from './dcaInitialOrderService';
import type { DcaRuntimeOrderPersistenceModel } from '../../domain/strategy/dca/dcaRuntimeOrderModel';
import { DcaOrderService } from './dcaOrderService';
import { DcaStopLossService } from './dcaStopLossService';
import type {
  DcaExitOrderModelSelector,
  DcaExitOrderPersistenceModel,
} from '../../domain/strategy/dca/dcaExitOrderModel';
import { DcaExitOrderModelSelectorImpl } from './models/dcaExitOrderModelSelector';
import type { DcaInitialOrderPersistenceModel } from '../../domain/strategy/dca/dcaInitialOrderModel';
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
  skippedDcaLevels: number[];
  reachedDcaLevels: DcaLevelEvaluation[];
  nextCycle?: DcaStrategyStartResult;
  initialOrderPending?: boolean;
  takeProfitPending?: boolean;
  stopLossPending?: boolean;
}

export class DcaStrategyService implements DcaStrategyRuntime {
  private readonly cycleModels: DcaCycleModelSelector;
  private readonly initialOrderService: DcaInitialOrderService;
  private readonly orderService: DcaOrderService;
  private readonly orderRepository: DcaRuntimeOrderModelSelector;
  private readonly takeProfitService: DcaTakeProfitService;
  private readonly stopLossService: DcaStopLossService;
  private readonly exitOrderRepository: DcaExitOrderModelSelector;

  constructor(
    cyclePersistence: DcaCyclePersistenceModel,
    runtimeOrderPersistence: DcaRuntimeOrderPersistenceModel,
    exitOrderPersistence: DcaExitOrderPersistenceModel,
    initialOrderPersistence: DcaInitialOrderPersistenceModel,
    orderRepository: DcaRuntimeOrderModelSelector,
    private readonly getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.cycleModels = new DcaCycleModelSelector(cyclePersistence);
    this.initialOrderService = new DcaInitialOrderService(
      cyclePersistence,
      initialOrderPersistence,
      this.getConfigurationModel,
    );
    this.orderService = new DcaOrderService(
      cyclePersistence,
      runtimeOrderPersistence,
      this.getConfigurationModel,
    );
    this.orderRepository = orderRepository;
    this.exitOrderRepository = new DcaExitOrderModelSelectorImpl(
      exitOrderPersistence,
    );
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

  async stop(
    configurationId: string,
  ): Promise<{ cycleId: string; cycleNumber: number }> {
    const configuration = this.getConfigurationModel(configurationId);

    if (!configuration) {
      throw new Error(`DCA configuration not found: ${configurationId}`);
    }

    const cycle = this.cycleModels.getCurrent(configurationId);

    if (!cycle) {
      throw new Error(
        `DCA configuration has no current cycle: ${configurationId}`,
      );
    }

    if (cycle.status !== 'active' && cycle.status !== 'pending') {
      throw new Error(
        `DCA configuration has no running cycle: ${configurationId}`,
      );
    }

    cycle.stop();

    return {
      cycleId: cycle.id,
      cycleNumber: cycle.cycleNumber,
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

    let cycle = this.cycleModels.getCurrent(configurationId);

    if (!cycle) {
      throw new Error(
        `DCA configuration has no current cycle: ${configurationId}`,
      );
    }

    if (cycle.status === 'pending') {
      await this.initialOrderService.reconcilePending(configurationId);
      cycle = this.cycleModels.getCurrent(configurationId);

      if (!cycle) {
        throw new Error(
          `DCA configuration has no current cycle after initial-order reconciliation: ${configurationId}`,
        );
      }

      if (cycle.status === 'pending') {
        const currentPrice = await configuration.exchange.getCurrentPrice(
          configuration.symbol,
        );

        return {
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          currentPrice,
          takeProfitReached: false,
          stopLossReached: false,
          executedDcaLevels: [],
      skippedDcaLevels: [],
          reachedDcaLevels: [],
          initialOrderPending: true,
        };
      }
    }

    if (cycle.status === 'stopped') {
      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: '',
        takeProfitReached: false,
        stopLossReached: false,
        executedDcaLevels: [],
        skippedDcaLevels: [],
        reachedDcaLevels: [],
        initialOrderPending: false,
      };
    }

    if (cycle.status !== 'active') {
      throw new Error(
        `DCA configuration has no active cycle: ${configurationId}`,
      );
    }

    if (!cycle.initialEntryPrice) {
      throw new Error(
        `DCA cycle has no initial entry price: ${cycle.id}`,
      );
    }

    const pendingTakeProfit = this.exitOrderRepository.getByCycleAndType(
      cycle.id,
      'takeProfit',
    );

    if (
      pendingTakeProfit &&
      (pendingTakeProfit.status === 'open' ||
        pendingTakeProfit.status === 'partiallyFilled')
    ) {
      const execution = await this.takeProfitService.execute(configurationId);

      if (execution.order.status === 'filled') {
        const nextCycle = await this.start(configurationId);

        return {
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          currentPrice: execution.currentPrice,
          takeProfitReached: true,
          stopLossReached: false,
          executedDcaLevels: [],
      skippedDcaLevels: [],
          reachedDcaLevels: [],
          nextCycle,
        };
      }

      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: execution.currentPrice,
        takeProfitReached: execution.reached,
        stopLossReached: false,
        executedDcaLevels: [],
      skippedDcaLevels: [],
        reachedDcaLevels: [],
        takeProfitPending: true,
      };
    }

    const pendingStopLoss = this.exitOrderRepository.getByCycleAndType(
      cycle.id,
      'stopLoss',
    );

    if (
      pendingStopLoss &&
      (pendingStopLoss.status === 'open' ||
        pendingStopLoss.status === 'partiallyFilled')
    ) {
      const execution = await this.stopLossService.execute(configurationId);

      if (execution.order.status === 'filled') {
        const nextCycle = await this.start(configurationId);

        return {
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          currentPrice: execution.currentPrice,
          takeProfitReached: false,
          stopLossReached: true,
          executedDcaLevels: [],
      skippedDcaLevels: [],
          reachedDcaLevels: [],
          nextCycle,
        };
      }

      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: execution.currentPrice,
        takeProfitReached: false,
        stopLossReached: execution.reached,
        executedDcaLevels: [],
      skippedDcaLevels: [],
        reachedDcaLevels: [],
        stopLossPending: true,
      };
    }

    const takeProfit = await this.takeProfitService.evaluate(
      configurationId,
    );

    if (takeProfit.reached) {
      const execution = await this.takeProfitService.execute(configurationId);

      if (execution.order.status !== 'filled') {
        return {
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          currentPrice: takeProfit.currentPrice,
          takeProfitReached: true,
          stopLossReached: false,
          executedDcaLevels: [],
      skippedDcaLevels: [],
          reachedDcaLevels: [],
          takeProfitPending: true,
        };
      }

      const nextCycle = await this.start(configurationId);

      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: takeProfit.currentPrice,
        takeProfitReached: true,
        stopLossReached: false,
        executedDcaLevels: [],
      skippedDcaLevels: [],
        reachedDcaLevels: [],
        nextCycle,
      };
    }

    const stopLoss = await this.stopLossService.evaluate(configurationId);

    if (stopLoss.reached) {
      const execution = await this.stopLossService.execute(configurationId);

      if (execution.order.status !== 'filled') {
        return {
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          currentPrice: stopLoss.currentPrice,
          takeProfitReached: false,
          stopLossReached: true,
          executedDcaLevels: [],
      skippedDcaLevels: [],
          reachedDcaLevels: [],
          stopLossPending: true,
        };
      }

      const nextCycle = await this.start(configurationId);

      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: stopLoss.currentPrice,
        takeProfitReached: false,
        stopLossReached: true,
        executedDcaLevels: [],
      skippedDcaLevels: [],
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
    const skippedDcaLevels: number[] = [];

    for (const level of reachedDcaLevels) {
      if (!level.reached) {
        continue;
      }

      try {
        const existingOrder = this.orderRepository.getByCycleAndLevel(
          cycle.id,
          level.level,
        );

        if (existingOrder) {
          const reconciliation = await this.orderService.reconcilePending(
            configurationId,
            cycle.id,
            level.level,
          );

          if (reconciliation.filled) {
            executedDcaLevels.push(level.level);
          }

          continue;
        }

        const execution = await this.orderService.execute(
          await this.orderService.prepare(
            configurationId,
            cycle.id,
            level.level,
          ),
        );

        if (execution.order.status === 'filled') {
          executedDcaLevels.push(level.level);
        }
      } catch {
        skippedDcaLevels.push(level.level);
      }
    }

    return {
      cycleId: cycle.id,
      cycleNumber: cycle.cycleNumber,
      currentPrice: stopLoss.currentPrice,
      takeProfitReached: false,
      stopLossReached: false,
      executedDcaLevels,
      skippedDcaLevels,
      reachedDcaLevels,
    };
  }
}
