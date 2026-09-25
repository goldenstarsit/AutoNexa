import { ExchangeRegistry } from './exchangeRegistry';
import { MexcExchangeAdapter } from './adapters/mexcExchangeAdapter';

export function createExchangeRegistry(): ExchangeRegistry {
  const registry = new ExchangeRegistry();

  registry.register(new MexcExchangeAdapter());

  return registry;
}
