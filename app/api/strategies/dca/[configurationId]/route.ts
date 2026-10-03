import { NextResponse } from 'next/server';
import { withApplicationContext } from '../../../../../src/application/withApplicationContext';

interface RouteContext {
  params: Promise<{
    configurationId: string;
  }>;
}

interface StrategyRequest {
  action: 'start' | 'process' | 'stop';
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const { configurationId } = await context.params;

  let body: StrategyRequest;

  try {
    body = (await request.json()) as StrategyRequest;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 },
    );
  }

  if (
    body.action !== 'start' &&
    body.action !== 'process' &&
    body.action !== 'stop'
  ) {
    return NextResponse.json(
      { error: 'Request action must be start, process, or stop' },
      { status: 400 },
    );
  }

  try {
    return withApplicationContext(async (app) => {
      const strategy = app.strategyTypes.get('dca').strategy;
      const instance = strategy.instances.get(configurationId);

      if (!instance) {
        throw new Error(`DCA configuration not found: ${configurationId}`);
      }

      const result =
        body.action === 'start'
          ? await strategy.start(instance.id)
          : body.action === 'process'
            ? await strategy.process(instance.id)
            : await strategy.stop(instance.id);

      return NextResponse.json({
        configurationId,
        action: body.action,
        result,
      });
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
