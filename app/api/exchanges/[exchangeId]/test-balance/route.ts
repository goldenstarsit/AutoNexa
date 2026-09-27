import { NextResponse } from 'next/server';
import { withApplicationContext } from '../../../../../src/application/withApplicationContext';

interface RouteContext {
  params: Promise<{
    exchangeId: string;
  }>;
}

interface BalanceRequest {
  action: 'deposit' | 'withdraw';
  asset: string;
  amount: string;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { exchangeId } = await context.params;

  return withApplicationContext(async (app) => {
    const service = app.getTestBalanceService(exchangeId);
    const account = await service.getAccount();

    return NextResponse.json({
      exchangeId,
      mode: 'test',
      balances: account.balances,
    });
  });
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const { exchangeId } = await context.params;

  let body: BalanceRequest;

  try {
    body = (await request.json()) as BalanceRequest;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 },
    );
  }

  if (
    (body.action !== 'deposit' && body.action !== 'withdraw') ||
    typeof body.asset !== 'string' ||
    body.asset.trim() === '' ||
    typeof body.amount !== 'string'
  ) {
    return NextResponse.json(
      {
        error:
          'Request must contain action, asset, and amount',
      },
      { status: 400 },
    );
  }

  try {
    return withApplicationContext(async (app) => {
      const service = app.getTestBalanceService(exchangeId);

      if (body.action === 'deposit') {
        service.deposit(body.asset.trim().toUpperCase(), body.amount);
      } else {
        service.withdraw(body.asset.trim().toUpperCase(), body.amount);
      }

      const account = await service.getAccount();

      return NextResponse.json({
        exchangeId,
        mode: 'test',
        balances: account.balances,
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
