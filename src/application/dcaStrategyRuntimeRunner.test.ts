import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  DcaStrategyProcessResult,
  DcaStrategyStartResult,
  DcaStrategyRuntime,
} from '../domain/strategy/dca/dcaStrategyRuntime';
import type { DcaConfigurationRecord } from '../strategy/dca/dcaConfigurationRepository';
import type {
  DcaCycleRecord,
  DcaCycleStatus,
} from '../strategy/dca/dcaCycleRepository';
import { DcaStrategyRuntimeRunner } from './dcaStrategyRuntimeRunner';

function configuration(
  id: string,
  enabled = true,
): DcaConfigurationRecord {
  return {
    id,
    strategyTypeId: 'dca',
    name: id,
    balanceModeId: 'test',
    exchangeId: 'mexc',
    executionModeId: 'makerOnly',
    symbol: 'BTCUSDT',
    takeProfitPercent: '2',
    stopLossPercent: '10',
    enabled,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orders: [],
  };
}

function cycle(
  id: string,
  configurationId: string,
  status: DcaCycleStatus,
): DcaCycleRecord {
  return {
    id,
    dcaConfigurationId: configurationId,
    cycleNumber: 1,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function result(cycleId = 'cycle-1'): DcaStrategyProcessResult {
  return {
    cycleId,
    cycleNumber: 1,
    currentPrice: '100',
    takeProfitReached: false,
    stopLossReached: false,
    executedDcaLevels: [],
    reachedDcaLevels: [],
  };
}

function startResult(cycleId = 'cycle-1'): DcaStrategyStartResult {
  return {
    cycleId,
    cycleNumber: 1,
    initialOrder: {},
  };
}

class FakeRuntime implements DcaStrategyRuntime {
  readonly starts: string[] = [];
  readonly processes: string[] = [];
  private processResolvers: Array<() => void> = [];
  processStarted = 0;

  async start(configurationId: string): Promise<DcaStrategyStartResult> {
    this.starts.push(configurationId);
    return startResult();
  }

  async process(configurationId: string): Promise<DcaStrategyProcessResult> {
    this.processes.push(configurationId);
    this.processStarted += 1;

    await new Promise<void>((resolve) => {
      this.processResolvers.push(resolve);
    });

    return result();
  }

  async stop(configurationId: string): Promise<{
    cycleId: string;
    cycleNumber: number;
  }> {
    return {
      cycleId: configurationId,
      cycleNumber: 1,
    };
  }

  releaseProcesses(): void {
    for (const resolve of this.processResolvers.splice(0)) {
      resolve();
    }
  }
}

class FakeConfigurationRepository {
  constructor(private readonly configurations: DcaConfigurationRecord[]) {}

  getAll(): DcaConfigurationRecord[] {
    return this.configurations;
  }

  getById(id: string): DcaConfigurationRecord | undefined {
    return this.configurations.find((configuration) => configuration.id === id);
  }
}

class FakeCycleRepository {
  constructor(private readonly cycles = new Map<string, DcaCycleRecord>()) {}

  getCurrent(configurationId: string): DcaCycleRecord | undefined {
    return this.cycles.get(configurationId);
  }
}

test('starts enabled strategy when no cycle exists', async () => {
  const runtime = new FakeRuntime();
  const repository = new FakeConfigurationRepository([
    configuration('strategy-1'),
  ]);
  const cycles = new FakeCycleRepository();
  const runner = new DcaStrategyRuntimeRunner(
    runtime,
    repository as never,
    cycles as never,
    { intervalMs: 1000 },
  );

  runner.start();
  await new Promise((resolve) => setTimeout(resolve, 10));
  runner.stop();

  assert.deepEqual(runtime.starts, ['strategy-1']);
  assert.deepEqual(runtime.processes, []);
});

test('processes enabled strategy with an existing cycle', async () => {
  const runtime = new FakeRuntime();
  const repository = new FakeConfigurationRepository([
    configuration('strategy-1'),
  ]);
  const cycles = new FakeCycleRepository(
    new Map([
      ['strategy-1', cycle('cycle-1', 'strategy-1', 'active')],
    ]),
  );
  const runner = new DcaStrategyRuntimeRunner(
    runtime,
    repository as never,
    cycles as never,
    { intervalMs: 1000 },
  );

  runner.start();
  await new Promise((resolve) => setTimeout(resolve, 10));
  runner.stop();
  runtime.releaseProcesses();

  assert.deepEqual(runtime.starts, []);
  assert.deepEqual(runtime.processes, ['strategy-1']);
});

test('ignores disabled strategy', async () => {
  const runtime = new FakeRuntime();
  const repository = new FakeConfigurationRepository([
    configuration('strategy-1', false),
  ]);
  const cycles = new FakeCycleRepository();
  const runner = new DcaStrategyRuntimeRunner(
    runtime,
    repository as never,
    cycles as never,
    { intervalMs: 1000 },
  );

  runner.start();
  await new Promise((resolve) => setTimeout(resolve, 10));
  runner.stop();

  assert.deepEqual(runtime.starts, []);
  assert.deepEqual(runtime.processes, []);
});

test('does not overlap the same strategy across ticks', async () => {
  const runtime = new FakeRuntime();
  const repository = new FakeConfigurationRepository([
    configuration('strategy-1'),
  ]);
  const cycles = new FakeCycleRepository(
    new Map([
      ['strategy-1', cycle('cycle-1', 'strategy-1', 'active')],
    ]),
  );
  const runner = new DcaStrategyRuntimeRunner(
    runtime,
    repository as never,
    cycles as never,
    { intervalMs: 1 },
  );

  runner.start();
  await new Promise((resolve) => setTimeout(resolve, 15));
  runner.stop();

  assert.equal(runtime.processStarted, 1);

  runtime.releaseProcesses();
});

test('isolates one strategy failure from another', async () => {
  const calls: string[] = [];

  const runtime: DcaStrategyRuntime = {
    async start(configurationId: string): Promise<DcaStrategyStartResult> {
      calls.push(`start:${configurationId}`);

      if (configurationId === 'strategy-1') {
        throw new Error('strategy failure');
      }

      return startResult();
    },

    async process(): Promise<DcaStrategyProcessResult> {
      return result();
    },

    async stop(configurationId: string): Promise<{
      cycleId: string;
      cycleNumber: number;
    }> {
      return {
        cycleId: configurationId,
        cycleNumber: 1,
      };
    },
  };

  const repository = new FakeConfigurationRepository([
    configuration('strategy-1'),
    configuration('strategy-2'),
  ]);
  const cycles = new FakeCycleRepository();
  const runner = new DcaStrategyRuntimeRunner(
    runtime,
    repository as never,
    cycles as never,
    { intervalMs: 1000 },
  );

  runner.start();
  await new Promise((resolve) => setTimeout(resolve, 10));
  runner.stop();

  assert.deepEqual(calls.sort(), [
    'start:strategy-1',
    'start:strategy-2',
  ]);
});

test('stop prevents later ticks', async () => {
  const runtime = new FakeRuntime();
  const repository = new FakeConfigurationRepository([
    configuration('strategy-1'),
  ]);
  const cycles = new FakeCycleRepository();
  const runner = new DcaStrategyRuntimeRunner(
    runtime,
    repository as never,
    cycles as never,
    { intervalMs: 5 },
  );

  runner.start();

  await new Promise((resolve) => setTimeout(resolve, 10));
  runner.stop();

  const startsAfterStop = runtime.starts.length;
  const processesAfterStop = runtime.processes.length;

  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.equal(runtime.starts.length, startsAfterStop);
  assert.equal(runtime.processes.length, processesAfterStop);
});
