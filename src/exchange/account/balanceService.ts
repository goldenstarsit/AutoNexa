import type { DatabaseAdapter } from '../../database/databaseAdapter';
import type { ExchangeAccount } from './exchangeAccount';
import type { ExchangeBalanceMode } from './balanceMode';
import { BalanceModeService } from './balanceModeService';
import { BalanceSourceRouter } from './balanceSourceRouter';
import type { BalanceSource } from './balanceSource';

export class BalanceService {
  private readonly balanceModeService: BalanceModeService;
  private readonly sourceRouter: BalanceSourceRouter;

  constructor(
    db: DatabaseAdapter,
    sources: ReadonlyMap<ExchangeBalanceMode, BalanceSource>,
  ) {
    this.balanceModeService = new BalanceModeService(db);
    this.sourceRouter = new BalanceSourceRouter(sources);
  }

  getBalanceModes() {
    return this.balanceModeService.getAll();
  }

  async getAccount(mode: ExchangeBalanceMode): Promise<ExchangeAccount> {
    if (!this.balanceModeService.isEnabled(mode)) {
      throw new Error(`Balance mode is disabled: ${mode}`);
    }

    return this.sourceRouter.getAccount(mode);
  }
}
