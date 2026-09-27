import type { DatabaseAdapter } from '../database/databaseAdapter';
import { ExchangeRepository, type ExchangeRecord } from './exchangeRepository';
import { ExchangeRegistry } from './exchangeRegistry';
import { createExchangeAdapter } from './exchangeAdapterFactory';
import { ExecutionModeService } from './order/executionModeService';

export class ExchangeService {
  private readonly repository: ExchangeRepository;
  private readonly registry: ExchangeRegistry;
  private readonly executionModeService: ExecutionModeService;

  constructor(db: DatabaseAdapter) {
    this.repository = new ExchangeRepository(db);
    this.registry = new ExchangeRegistry();
    this.executionModeService = new ExecutionModeService(db);
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
}
