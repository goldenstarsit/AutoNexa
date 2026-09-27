import { ExchangeRegistry } from './exchangeRegistry';
import type { DatabaseAdapter } from '../database/databaseAdapter';
import { MexcExchangeAdapter } from './adapters/mexcExchangeAdapter';

export function createExchangeRegistry(db: DatabaseAdapter): ExchangeRegistry {
  const registry = new ExchangeRegistry();

  registry.register(new MexcExchangeAdapter(db));

  return registry;
}
