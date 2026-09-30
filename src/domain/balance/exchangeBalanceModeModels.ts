import type { ExchangeBalanceMode } from '../../exchange/account/balanceMode';
import type { BalanceSource } from '../../exchange/account/balanceSource';
import type { TestBalanceOperations } from '../../exchange/account/testBalanceOperations';
import type { ExchangeModel } from '../exchange/exchangeModel';
import type { BalanceModeModel, BalanceModeModelSelector } from './balanceModeModel';

class ExchangeBalanceSource implements BalanceSource {
  constructor(
    private readonly exchange: ExchangeModel,
    private readonly mode: ExchangeBalanceMode,
  ) {}

  getAccount() {
    return this.exchange.getAccount(this.mode);
  }
}

class LiveBalanceModeModel implements BalanceModeModel {
  readonly id: ExchangeBalanceMode = 'live';
  readonly name = 'Live';
  readonly enabled = true;

  constructor(readonly source: BalanceSource) {}
}

class TestBalanceModeModel implements BalanceModeModel {
  readonly id: ExchangeBalanceMode = 'test';
  readonly name = 'Test';
  readonly enabled = true;

  constructor(
    readonly source: BalanceSource,
    readonly testOperations: TestBalanceOperations,
  ) {}
}

export class ExchangeBalanceModeModelRegistry
  implements BalanceModeModelSelector
{
  private readonly models = new Map<ExchangeBalanceMode, BalanceModeModel>();

  constructor(exchange: ExchangeModel) {
    const liveSource = new ExchangeBalanceSource(exchange, 'live');
    const testSource = new ExchangeBalanceSource(exchange, 'test');

    this.models.set(
      'live',
      new LiveBalanceModeModel(liveSource),
    );

    this.models.set(
      'test',
      new TestBalanceModeModel(testSource, exchange),
    );
  }

  get(id: string): BalanceModeModel {
    const model = this.models.get(id as ExchangeBalanceMode);

    if (!model) {
      throw new Error(`Unsupported balance mode: ${id}`);
    }

    if (!model.enabled) {
      throw new Error(`Balance mode is disabled: ${id}`);
    }

    return model;
  }
}
