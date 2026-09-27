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
    const account = await app.exchanges.getAccount(exchangeId, 'test');

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
      const asset = body.asset.trim().toUpperCase();

      if (body.action === 'deposit') {
        app.exchanges.depositTestBalance(exchangeId, asset, body.amount);
      } else {
        app.exchanges.withdrawTestBalance(exchangeId, asset, body.amount);
      }

      const account = await app.exchanges.getAccount(exchangeId, 'test');

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
