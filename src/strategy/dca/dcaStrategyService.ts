import type { DatabaseModel } from '../../domain/database/databaseModel';
import type { BalanceModeModelSelector } from '../../domain/balance/balanceModeModel';
import type { ExchangeModelSelector } from '../../domain/exchange/exchangeModel';
import type { ExecutionModeModelSelector } from '../../domain/execution/executionModeModel';
import type { DcaConfigurationModel } from '../../domain/strategy/dca/dcaConfigurationModel';
import type { StrategyTypeModelSelector } from '../../domain/strategy/strategyTypeModel';
import { DcaCycleService } from './dcaCycleService';
import { DcaInitialOrderService } from './dcaInitialOrderService';
import { DcaOrderRepository } from './dcaOrderRepository';
import { DcaOrderService } from './dcaOrderService';
import { DcaStopLossService } from './dcaStopLossService';
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
}

export class DcaStrategyService {
  private readonly cycleService: DcaCycleService;
  private readonly initialOrderService: DcaInitialOrderService;
  private readonly orderService: DcaOrderService;
  private readonly orderRepository: DcaOrderRepository;
  private readonly takeProfitService: DcaTakeProfitService;
  private readonly stopLossService: DcaStopLossService;

  constructor(
    private readonly db: DatabaseModel,
    strategyTypes: StrategyTypeModelSelector,
    balanceModes: BalanceModeModelSelector,
    exchanges: ExchangeModelSelector,
    executionModes: ExecutionModeModelSelector,
    private readonly getConfigurationModel: (
      configurationId: string,
    ) => DcaConfigurationModel | undefined,
  ) {
    this.cycleService = new DcaCycleService(
      db,
      strategyTypes,
      balanceModes,
      exchanges,
      executionModes,
    );
    this.initialOrderService = new DcaInitialOrderService(
      db,
      strategyTypes,
      balanceModes,
      exchanges,
      executionModes,
    );
    this.orderService = new DcaOrderService(
      db,
      strategyTypes,
      balanceModes,
      exchanges,
      executionModes,
    );
    this.orderRepository = new DcaOrderRepository(db);
    this.takeProfitService = new DcaTakeProfitService(
      db,
      strategyTypes,
      balanceModes,
      exchanges,
      executionModes,
    );
    this.stopLossService = new DcaStopLossService(
      db,
      strategyTypes,
      balanceModes,
      exchanges,
      executionModes,
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

    const current = this.cycleService.getCurrent(configurationId);

    if (current?.status === 'active' || current?.status === 'pending') {
      throw new Error(
        `DCA configuration already has an active cycle: ${current.id}`,
      );
    }

    const initialOrder =
      await this.initialOrderService.startCycleAndExecute(configurationId);

    return {
      cycleId: initialOrder.cycleId,
      cycleNumber: this.cycleService.getCurrent(configurationId)?.cycleNumber ?? 0,
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

    const cycle = this.cycleService.getCurrent(configurationId);

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

      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: takeProfit.currentPrice,
        takeProfitReached: true,
        stopLossReached: false,
        executedDcaLevels: [],
        reachedDcaLevels: [],
      };
    }

    const stopLoss = await this.stopLossService.evaluate(configurationId);

    if (stopLoss.reached) {
      await this.stopLossService.execute(configurationId);

      return {
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        currentPrice: stopLoss.currentPrice,
        takeProfitReached: false,
        stopLossReached: true,
        executedDcaLevels: [],
        reachedDcaLevels: [],
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
