import { NextRequest, NextResponse } from 'next/server';
import { createApplicationContext } from '@/src/application/createApplicationContext';

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{ configurationId: string }>;
  },
) {
  try {
    const { configurationId } = await context.params;
    const body = await request.json();

    const app = createApplicationContext();
    const strategy = app.strategyTypes.get('dca').strategy;
    const configuration = strategy.instances.get(configurationId);

    if (!configuration) {
      return NextResponse.json(
        { error: `DCA configuration not found: ${configurationId}` },
        { status: 404 },
      );
    }

    app.dcaConfigurationService.update(configurationId, {
      balanceModeId: body.balanceModeId,
      executionModeId: body.executionModeId,
      takeProfitPercent: body.takeProfitPercent,
      stopLossPercent: body.stopLossPercent,
      enabled: body.enabled,
      dropPercents: body.dropPercents,
    });

    return NextResponse.json({
      configurationId,
      configuration: app.dcaConfigurationRepository.getById(configurationId),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid configuration request';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
