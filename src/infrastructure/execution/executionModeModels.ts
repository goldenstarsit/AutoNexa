import type {
  ExecutionModeId,
  ExecutionModeModel,
  ExecutionModeModelSelector,
} from '../../domain/execution/executionModeModel';
import type { ExecutionModeProvider } from '../../domain/execution/executionModeProvider';

abstract class BaseExecutionModeModel implements ExecutionModeModel {
  abstract readonly id: ExecutionModeId;
  abstract readonly name: string;
  constructor(
    private readonly executionModeProvider: ExecutionModeProvider,
  ) {}

  get enabled(): boolean {
    return this.executionModeProvider.isEnabled(this.id);
  }

  abstract execute<T>(operation: {
    maker: () => Promise<T>;
    taker: () => Promise<T>;
  }): Promise<T>;
}

class MakerOnlyExecutionModeModel extends BaseExecutionModeModel {
  readonly id: ExecutionModeId = 'makerOnly';
  readonly name = 'Maker Only';

  execute<T>(operation: {
    maker: () => Promise<T>;
    taker: () => Promise<T>;
  }): Promise<T> {
    return operation.maker();
  }
}

class TakerOnlyExecutionModeModel extends BaseExecutionModeModel {
  readonly id: ExecutionModeId = 'takerOnly';
  readonly name = 'Taker Only';

  execute<T>(operation: {
    maker: () => Promise<T>;
    taker: () => Promise<T>;
  }): Promise<T> {
    return operation.taker();
  }
}

class HybridExecutionModeModel extends BaseExecutionModeModel {
  readonly id: ExecutionModeId = 'hybrid';
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

export class ExecutionModeModelRegistry
  implements ExecutionModeModelSelector
{
  private readonly models = new Map<ExecutionModeId, ExecutionModeModel>();

  constructor(private readonly executionModeProvider: ExecutionModeProvider) {
    this.models.set(
      'makerOnly',
      new MakerOnlyExecutionModeModel(this.executionModeProvider),
    );
    this.models.set(
      'takerOnly',
      new TakerOnlyExecutionModeModel(this.executionModeProvider),
    );
    this.models.set(
      'hybrid',
      new HybridExecutionModeModel(this.executionModeProvider),
    );
  }

  get(id: string): ExecutionModeModel {
    const model = this.models.get(id as ExecutionModeId);

    if (!model) {
      throw new Error(`Unsupported execution mode: ${id}`);
    }

    if (!model.enabled) {
      throw new Error(`Execution mode is disabled: ${id}`);
    }

    return model;
  }
}
