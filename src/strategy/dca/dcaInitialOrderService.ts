import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../exchange/order/exchangeOrder';
import { ExchangeService } from '../../exchange/exchangeService';
import { DcaConfigurationService } from './dcaConfigurationService';
import { DcaTradingRuleResolver } from './dcaTradingRuleResolver';

export interface DcaInitialOrderPreparation {
  configurationId: string;
  symbol: string;
  exchangeId: string;
  executionMode: ExchangeOrderRequest['executionMode'];
  quantity: string;
  currentPrice: string;
  request: ExchangeOrderRequest;
}

export class DcaInitialOrderService {
  private readonly configurationService: DcaConfigurationService;
  private readonly tradingRuleResolver: DcaTradingRuleResolver;
  private readonly exchangeService: ExchangeService;

  constructor(private readonly db: DatabaseAdapter) {
    this.configurationService = new DcaConfigurationService(db);
    this.tradingRuleResolver = new DcaTradingRuleResolver(db);
    this.exchangeService = new ExchangeService(db);
  }

  async prepare(
    configurationId: string,
  ): Promise<DcaInitialOrderPreparation> {
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

    const executionMode = configuration.executionModeId;

    if (
      executionMode !== 'makerOnly' &&
      executionMode !== 'takerOnly' &&
      executionMode !== 'hybrid'
    ) {
      throw new Error(
        `Unsupported DCA execution mode: ${executionMode}`,
      );
    }

    const rules = await this.tradingRuleResolver.resolve(
      configuration.exchangeId,
      configuration.symbol,
    );

    const currentPrice =
      await this.exchangeService.getCurrentPrice(
        configuration.exchangeId,
        configuration.symbol,
      );

    const request: ExchangeOrderRequest = {
      symbol: configuration.symbol,
      side: 'buy',
      type: 'market',
      executionMode,
      quantity: rules.minimumQuantity,
    };

    return {
      configurationId: configuration.id,
      symbol: configuration.symbol,
      exchangeId: configuration.exchangeId,
      executionMode,
      quantity: rules.minimumQuantity,
      currentPrice,
      request,
    };
  }

  async execute(
    configurationId: string,
  ): Promise<ExchangeOrder> {
    const preparation = await this.prepare(configurationId);

    return this.exchangeService.placeOrder(
      preparation.exchangeId,
      preparation.request,
    );
  }
}
