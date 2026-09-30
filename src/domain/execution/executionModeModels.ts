import type { ExchangeOrderExecutionMode } from '../../exchange/order/exchangeOrder';
import type { ExecutionModeModel, ExecutionModeModelSelector } from './executionModeModel';

abstract class BaseExecutionModeModel implements ExecutionModeModel {
  abstract readonly id: ExchangeOrderExecutionMode;
  abstract readonly name: string;
  readonly enabled = true;

  abstract execute<T>(operation: {
    maker: () => Promise<T>;
    taker: () => Promise<T>;
  }): Promise<T>;
}

class MakerOnlyExecutionModeModel extends BaseExecutionModeModel {
  readonly id: ExchangeOrderExecutionMode = 'makerOnly';
  readonly name = 'Maker Only';

  execute<T>(operation: {
    maker: () => Promise<T>;
    taker: () => Promise<T>;
  }): Promise<T> {
    return operation.maker();
  }
}

class TakerOnlyExecutionModeModel extends BaseExecutionModeModel {
  readonly id: ExchangeOrderExecutionMode = 'takerOnly';
  readonly name = 'Taker Only';

  execute<T>(operation: {
    maker: () => Promise<T>;
    taker: () => Promise<T>;
  }): Promise<T> {
    return operation.taker();
  }
}

class HybridExecutionModeModel extends BaseExecutionModeModel {
  readonly id: ExchangeOrderExecutionMode = 'hybrid';
  readonly name = 'Hybrid';

  async execute<T>(operation: {
    maker: () => Promise<T>;
    taker: () => Promise<T>;
  }): Promise<T> {
    try {
      return await operation.maker();
    } catch {
      return operation.taker();
    }
  }
}

export class ExecutionModeModelRegistry implements ExecutionModeModelSelector {
  private readonly models = new Map<
    ExchangeOrderExecutionMode,
    ExecutionModeModel
  >([
    ['makerOnly', new MakerOnlyExecutionModeModel()],
    ['takerOnly', new TakerOnlyExecutionModeModel()],
    ['hybrid', new HybridExecutionModeModel()],
  ]);

  get(id: string): ExecutionModeModel {
    const model = this.models.get(id as ExchangeOrderExecutionMode);

    if (!model) {
      throw new Error(`Unsupported execution mode: ${id}`);
    }

    if (!model.enabled) {
      throw new Error(`Execution mode is disabled: ${id}`);
    }

    return model;
  }
}
