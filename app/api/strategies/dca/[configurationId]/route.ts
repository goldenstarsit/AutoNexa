import { NextResponse } from 'next/server';
import { withApplicationContext } from '../../../../../src/application/withApplicationContext';

interface RouteContext {
  params: Promise<{
    configurationId: string;
  }>;
}

interface StrategyRequest {
  action: 'start' | 'process';
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

  if (body.action !== 'start' && body.action !== 'process') {
    return NextResponse.json(
      { error: 'Request action must be start or process' },
      { status: 400 },
    );
  }

  try {
    return withApplicationContext(async (app) => {
      const result =
        body.action === 'start'
          ? await app.dcaStrategy.start(configurationId)
          : await app.dcaStrategy.process(configurationId);

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
