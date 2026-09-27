import type { DatabaseAdapter } from '../database/databaseAdapter';
import { ExchangeRepository, type ExchangeRecord } from './exchangeRepository';
import { ExchangeRegistry } from './exchangeRegistry';
import { createExchangeAdapter } from './exchangeAdapterFactory';
import { ExecutionModeService } from './order/executionModeService';
import { BalanceModeService } from './account/balanceModeService';
import type { ExchangeBalanceMode } from './account/balanceMode';

export class ExchangeService {
  private readonly db: DatabaseAdapter;
  private readonly repository: ExchangeRepository;
  private readonly registry: ExchangeRegistry;
  private readonly executionModeService: ExecutionModeService;
  private readonly balanceModeService: BalanceModeService;

  constructor(db: DatabaseAdapter) {
    this.db = db;
    this.repository = new ExchangeRepository(db);
    this.registry = new ExchangeRegistry();
    this.executionModeService = new ExecutionModeService(db);
    this.balanceModeService = new BalanceModeService(db);
  }

  loadEnabledExchanges(): ExchangeRecord[] {
    const exchanges = this.repository
      .getAll()
      .filter((exchange) => exchange.enabled);

    for (const exchange of exchanges) {
      if (!this.registry.has(exchange.id)) {
        this.registry.register(
          createExchangeAdapter(
            exchange.id,
            this.db,
            this.executionModeService,
          ),
        );
      }
    }

    return exchanges;
  }

  getRegistry(): ExchangeRegistry {
    return this.registry;
  }

  getExecutionModeService(): ExecutionModeService {
    return this.executionModeService;
  }

  async getAccount(
    exchangeId: string,
    mode: ExchangeBalanceMode = 'live',
  ) {
    const adapter = this.registry.get(exchangeId);

    if (!adapter) {
      throw new Error(`Exchange not registered: ${exchangeId}`);
    }

    if (!this.balanceModeService.isEnabled(mode)) {
      throw new Error(`Balance mode is disabled: ${mode}`);
    }

    return adapter.getAccount(mode);
  }
}
