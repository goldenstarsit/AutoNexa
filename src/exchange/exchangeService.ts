import type { DatabaseAdapter } from '../database/databaseAdapter';
import { ExchangeRepository, type ExchangeRecord } from './exchangeRepository';
import { ExchangeRegistry } from './exchangeRegistry';
import { createExchangeAdapter } from './exchangeAdapterFactory';
import { ExecutionModeRepository } from './order/executionModeRepository';
import { BalanceModeRepository } from './account/balanceModeRepository';
import type { ExchangeBalanceMode } from './account/balanceMode';

export class ExchangeService {
  private readonly db: DatabaseAdapter;
  private readonly repository: ExchangeRepository;
  private readonly registry: ExchangeRegistry;
  private readonly executionModeRepository: ExecutionModeRepository;
  private readonly balanceModeRepository: BalanceModeRepository;

  constructor(db: DatabaseAdapter) {
    this.db = db;
    this.repository = new ExchangeRepository(db);
    this.registry = new ExchangeRegistry();
    this.executionModeRepository = new ExecutionModeRepository(db);
    this.balanceModeRepository = new BalanceModeRepository(db);
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
            this.executionModeRepository,
          ),
        );
      }
    }

    return exchanges;
  }

  private getAdapter(exchangeId: string) {
    if (!this.registry.has(exchangeId)) {
      this.loadEnabledExchanges();
    }

    return this.registry.get(exchangeId);
  }


  depositTestBalance(
    exchangeId: string,
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void {
    const adapter = this.getAdapter(exchangeId);

    adapter.depositTestBalance(asset, amount, updatedAt);
  }

  withdrawTestBalance(
    exchangeId: string,
    asset: string,
    amount: string,
    updatedAt?: string,
  ): void {
    const adapter = this.getAdapter(exchangeId);

    adapter.withdrawTestBalance(asset, amount, updatedAt);
  }

  async getTradingRules(exchangeId: string, symbol: string) {
    const adapter = this.getAdapter(exchangeId);
    return adapter.getTradingRules(symbol);
  }

  async getCurrentPrice(exchangeId: string, symbol: string) {
    const adapter = this.getAdapter(exchangeId);
    return adapter.getCurrentPrice(symbol);
  }

  async getAccount(
    exchangeId: string,
    mode: ExchangeBalanceMode = 'live',
  ) {
    const adapter = this.getAdapter(exchangeId);

    if (!this.balanceModeRepository.isEnabled(mode)) {
      throw new Error(`Balance mode is disabled: ${mode}`);
    }

    return adapter.getAccount(mode);
  }
}
