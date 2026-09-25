import type { DatabaseAdapter } from '../database/databaseAdapter';
import { ExchangeRepository, type ExchangeRecord } from './exchangeRepository';
import { ExchangeRegistry } from './exchangeRegistry';
import { createExchangeAdapter } from './exchangeAdapterFactory';

export class ExchangeService {
  private readonly repository: ExchangeRepository;
  private readonly registry: ExchangeRegistry;

  constructor(db: DatabaseAdapter) {
    this.repository = new ExchangeRepository(db);
    this.registry = new ExchangeRegistry();
  }

  loadEnabledExchanges(): ExchangeRecord[] {
    const exchanges = this.repository
      .getAll()
      .filter((exchange) => exchange.enabled);

    for (const exchange of exchanges) {
      if (!this.registry.has(exchange.id)) {
        this.registry.register(createExchangeAdapter(exchange.id));
      }
    }

    return exchanges;
  }

  getRegistry(): ExchangeRegistry {
    return this.registry;
  }
}
