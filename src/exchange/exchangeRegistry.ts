import type { ExchangeAdapter } from './exchange';

export class ExchangeRegistry {
  private readonly adapters = new Map<string, ExchangeAdapter>();

  register(adapter: ExchangeAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Exchange adapter already registered: ${adapter.id}`);
    }

    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ExchangeAdapter {
    const adapter = this.adapters.get(id);

    if (!adapter) {
      throw new Error(`Exchange adapter not registered: ${id}`);
    }

    return adapter;
  }

  has(id: string): boolean {
    return this.adapters.has(id);
  }

  all(): ExchangeAdapter[] {
    return [...this.adapters.values()];
  }
}
