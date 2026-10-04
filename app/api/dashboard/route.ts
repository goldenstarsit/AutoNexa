import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const SYMBOLS = ['BNBUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TRXUSDT'];

type DashboardRow = {
  id: string;
  symbol: string;
  enabled: number;
  balanceModeId: string;
  executionModeId: string;
  takeProfitPercent: string;
  stopLossPercent: string;
  cycleId: string | null;
  cycleNumber: number | null;
  cycleStatus: string | null;
  initialEntryPrice: string | null;
  averageEntryPrice: string | null;
  entryQuantity: string | null;
  entryQuoteQuantity: string | null;
  cycleUpdatedAt: string | null;
  totalDcaLevels: number;
  executedDcaLevels: number;
  pendingDcaLevels: number;
  initialOrderStatus: string | null;
  initialOrderPrice: string | null;
  initialExecutedQuantity: string | null;
  takeProfitStatus: string | null;
  takeProfitFillPrice: string | null;
  stopLossStatus: string | null;
  stopLossFillPrice: string | null;
};

async function getMarketPrice(symbol: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}`,
      { cache: 'no-store' },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as { price?: string };
    return data.price ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const db = new Database('data/autonexa.db', { readonly: true });

  try {
    const rows = db
      .prepare(
        `
        SELECT
          c.id,
          c.symbol,
          c.enabled,
          c.balance_mode_id AS balanceModeId,
          c.execution_mode_id AS executionModeId,
          c.take_profit_percent AS takeProfitPercent,
          c.stop_loss_percent AS stopLossPercent,

          cy.id AS cycleId,
          cy.cycle_number AS cycleNumber,
          cy.status AS cycleStatus,
          cy.initial_entry_price AS initialEntryPrice,
          cy.average_entry_price AS averageEntryPrice,
          cy.entry_quantity AS entryQuantity,
          cy.entry_quote_quantity AS entryQuoteQuantity,
          cy.updated_at AS cycleUpdatedAt,

          (
            SELECT COUNT(*)
            FROM dca_configuration_orders co
            WHERE co.dca_configuration_id = c.id
          ) AS totalDcaLevels,

          (
            SELECT COUNT(*)
            FROM dca_runtime_orders ro
            WHERE ro.dca_cycle_id = cy.id
              AND ro.status = 'filled'
          ) AS executedDcaLevels,

          (
            SELECT COUNT(*)
            FROM dca_runtime_orders ro
            WHERE ro.dca_cycle_id = cy.id
              AND ro.status NOT IN ('filled', 'cancelled', 'rejected')
          ) AS pendingDcaLevels,

          (
            SELECT io.status
            FROM dca_initial_orders io
            WHERE io.dca_cycle_id = cy.id
            LIMIT 1
          ) AS initialOrderStatus,

          (
            SELECT io.average_fill_price
            FROM dca_initial_orders io
            WHERE io.dca_cycle_id = cy.id
            LIMIT 1
          ) AS initialOrderPrice,

          (
            SELECT io.executed_quantity
            FROM dca_initial_orders io
            WHERE io.dca_cycle_id = cy.id
            LIMIT 1
          ) AS initialExecutedQuantity,

          (
            SELECT eo.status
            FROM dca_exit_orders eo
            WHERE eo.dca_cycle_id = cy.id
              AND eo.exit_type = 'takeProfit'
            LIMIT 1
          ) AS takeProfitStatus,

          (
            SELECT eo.average_fill_price
            FROM dca_exit_orders eo
            WHERE eo.dca_cycle_id = cy.id
              AND eo.exit_type = 'takeProfit'
            LIMIT 1
          ) AS takeProfitFillPrice,

          (
            SELECT eo.status
            FROM dca_exit_orders eo
            WHERE eo.dca_cycle_id = cy.id
              AND eo.exit_type = 'stopLoss'
            LIMIT 1
          ) AS stopLossStatus,

          (
            SELECT eo.average_fill_price
            FROM dca_exit_orders eo
            WHERE eo.dca_cycle_id = cy.id
              AND eo.exit_type = 'stopLoss'
            LIMIT 1
          ) AS stopLossFillPrice

        FROM dca_configurations c
        LEFT JOIN dca_cycles cy
          ON cy.id = (
            SELECT c2.id
            FROM dca_cycles c2
            WHERE c2.dca_configuration_id = c.id
            ORDER BY c2.cycle_number DESC
            LIMIT 1
          )
        WHERE c.symbol IN (${SYMBOLS.map(() => '?').join(',')})
        ORDER BY c.symbol
        `,
      )
      .all(...SYMBOLS) as DashboardRow[];

    const prices = await Promise.all(
      rows.map(async (row) => ({
        symbol: row.symbol,
        price: await getMarketPrice(row.symbol),
      })),
    );

    const priceMap = new Map(prices.map((item) => [item.symbol, item.price]));

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      strategies: rows.map((row) => ({
        ...row,
        currentPrice: priceMap.get(row.symbol) ?? null,
      })),
    });
  } finally {
    db.close();
  }
}
