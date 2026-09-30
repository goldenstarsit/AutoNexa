import type { DatabaseAdapter } from '../../database/databaseAdapter';
import { ExchangeService } from '../../exchange/exchangeService';
import { DcaConfigurationService } from './dcaConfigurationService';
import { DcaCycleService } from './dcaCycleService';
import {
  evaluateDcaStopLoss,
  type DcaStopLossEvaluation,
} from './dcaStopLossEvaluator';

export interface DcaStopLossServiceResult extends DcaStopLossEvaluation {
  configurationId: string;
  cycleId: string;
  cycleNumber: number;
  exchangeId: string;
  symbol: string;
}

export class DcaStopLossService {
  private readonly configurationService: DcaConfigurationService;
  private readonly cycleService: DcaCycleService;
  private readonly exchangeService: ExchangeService;

  constructor(private readonly db: DatabaseAdapter) {
    this.configurationService = new DcaConfigurationService(db);
    this.cycleService = new DcaCycleService(db);
    this.exchangeService = new ExchangeService(db);
  }

  async evaluate(
    configurationId: string,
  ): Promise<DcaStopLossServiceResult> {
    const configuration =
      this.configurationService.getById(configurationId);

    if (!configuration) {
      throw new Error(
        `DCA configuration not found: ${configurationId}`,
      );
    }

    if (!configuration.enabled) {
      throw new Error(
        `DCA configuration is disabled: ${configurationId}`,
      );
    }

    const cycle = this.cycleService.getCurrent(configurationId);

    if (!cycle) {
      throw new Error(
        `DCA cycle not found: ${configurationId}`,
      );
    }

    if (cycle.status !== 'active') {
      throw new Error(
        `DCA cycle is not active: ${cycle.id} (${cycle.status})`,
      );
    }

    if (!cycle.initialEntryPrice) {
      throw new Error(
        `DCA cycle has no initial entry price: ${cycle.id}`,
      );
    }

    const currentPrice = await this.exchangeService.getCurrentPrice(
      configuration.exchangeId,
      configuration.symbol,
    );

    const evaluation = evaluateDcaStopLoss(
      cycle.initialEntryPrice,
      configuration.stopLossPercent,
      currentPrice,
    );

    return {
      configurationId: configuration.id,
      cycleId: cycle.id,
      cycleNumber: cycle.cycleNumber,
      exchangeId: configuration.exchangeId,
      symbol: configuration.symbol,
      ...evaluation,
    };
  }
}
