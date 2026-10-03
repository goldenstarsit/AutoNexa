import { NextRequest, NextResponse } from 'next/server';
import { createApplicationContext } from '@/src/application/createApplicationContext';
import { MexcExchangeModel } from '@/src/infrastructure/exchange/mexcExchangeModel';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body.symbol !== 'string' || !body.symbol.trim()) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 },
      );
    }

    if (typeof body.price !== 'string' || !body.price.trim()) {
      return NextResponse.json(
        { error: 'Price is required' },
        { status: 400 },
      );
    }

    const app = createApplicationContext();
    const exchange = app.exchange;

    if (!(exchange instanceof MexcExchangeModel)) {
      return NextResponse.json(
        { error: 'MEXC exchange model is unavailable' },
        { status: 500 },
      );
    }

    exchange.setTestMarketPrice(body.symbol, body.price);

    return NextResponse.json({
      exchangeId: 'mexc',
      symbol: body.symbol.toUpperCase(),
      price: body.price,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid test market price request';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body.symbol !== 'string' || !body.symbol.trim()) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 },
      );
    }

    const app = createApplicationContext();
    const exchange = app.exchange;

    if (!(exchange instanceof MexcExchangeModel)) {
      return NextResponse.json(
        { error: 'MEXC exchange model is unavailable' },
        { status: 500 },
      );
    }

    exchange.clearTestMarketPrice(body.symbol);

    return NextResponse.json({
      exchangeId: 'mexc',
      symbol: body.symbol.toUpperCase(),
      cleared: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid test market price request';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
