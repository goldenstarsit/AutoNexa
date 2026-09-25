import type { ExchangeAdapter } from '../exchange';

export class MexcExchangeAdapter implements ExchangeAdapter {
  readonly id = 'mexc';
  readonly name = 'MEXC';

  async connect(): Promise<void> {
    // API connection will be implemented in the MEXC integration milestone.
  }

  async disconnect(): Promise<void> {
    // Connection cleanup will be implemented in the MEXC integration milestone.
  }
}
