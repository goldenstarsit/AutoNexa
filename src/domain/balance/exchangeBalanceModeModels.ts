import type { ExchangeModel } from '../exchange/exchangeModel';
import type {
  BalanceModeId,
  BalanceModeModel,
  BalanceModeModelSelector,
  BalanceSourceModel,
  TestBalanceOperationsModel,
} from './balanceModeModel';

class ExchangeBalanceSource implements BalanceSourceModel {
  constructor(
    private readonly exchange: ExchangeModel,
    private readonly mode: BalanceModeId,
  ) {}

  getAccount() {
    return this.exchange.getAccount(this.mode);
  }
}

class LiveBalanceModeModel implements BalanceModeModel {
  readonly id: BalanceModeId = 'live';
  readonly name = 'Live';
  readonly enabled = true;

  constructor(readonly source: BalanceSourceModel) {}
}

class TestBalanceModeModel implements BalanceModeModel {
  readonly id: BalanceModeId = 'test';
  readonly name = 'Test';
  readonly enabled = true;

  constructor(
    readonly source: BalanceSourceModel,
    readonly testOperations: TestBalanceOperationsModel,
  ) {}
}

export class ExchangeBalanceModeModelRegistry
  implements BalanceModeModelSelector
{
  private readonly models = new Map<BalanceModeId, BalanceModeModel>();

  constructor(exchange: ExchangeModel) {
    const liveSource = new ExchangeBalanceSource(exchange, 'live');
    const testSource = new ExchangeBalanceSource(exchange, 'test');

    const testOperations: TestBalanceOperationsModel = {
      depositTestBalance: (
        asset,
        amount,
        updatedAt,
      ) => exchange.depositTestBalance(asset, amount, updatedAt),
      withdrawTestBalance: (
        asset,
        amount,
        updatedAt,
      ) => exchange.withdrawTestBalance(asset, amount, updatedAt),
    };

    this.models.set(
      'live',
      new LiveBalanceModeModel(liveSource),
    );

    this.models.set(
      'test',
      new TestBalanceModeModel(testSource, testOperations),
    );
  }

  get(id: string): BalanceModeModel {
    const model = this.models.get(id as BalanceModeId);

    if (!model) {
      throw new Error(`Unsupported balance mode: ${id}`);
    }

    if (!model.enabled) {
      throw new Error(`Balance mode is disabled: ${id}`);
    }

    return model;
  }
}
