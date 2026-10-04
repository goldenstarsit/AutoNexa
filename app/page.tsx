'use client';

import { useCallback, useEffect, useState } from 'react';

type Strategy = {
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
  currentPrice: string | null;
};

const symbols = ['BNBUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TRXUSDT'];

function formatNumber(value: string | null, digits = 8) {
  if (value === null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function StatusPill({
  children,
  positive = false,
}: {
  children: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        positive
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-white/10 bg-white/5 text-zinc-300'
      }`}
    >
      {children}
    </span>
  );
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const progress =
    strategy.totalDcaLevels > 0
      ? Math.min(
          100,
          (strategy.executedDcaLevels / strategy.totalDcaLevels) * 100,
        )
      : 0;

  const status =
    strategy.cycleStatus ??
    (strategy.enabled ? 'waiting' : 'disabled');

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-bold tracking-tight text-white">
              {strategy.symbol}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {strategy.id}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <StatusPill positive={strategy.enabled === 1}>
              {strategy.enabled === 1 ? 'LIVE' : 'DISABLED'}
            </StatusPill>
            <StatusPill>{status.toUpperCase()}</StatusPill>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Current Price
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {formatNumber(strategy.currentPrice)}
            </div>
          </div>

          <div className="rounded-2xl bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Average Entry
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {formatNumber(strategy.averageEntryPrice)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400">DCA Progress</span>
            <span className="font-semibold text-white">
              {strategy.executedDcaLevels}/{strategy.totalDcaLevels}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-zinc-500">Cycle</div>
            <div className="mt-1 font-semibold text-white">
              {strategy.cycleNumber ?? '—'}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Balance</div>
            <div className="mt-1 font-semibold uppercase text-white">
              {strategy.balanceModeId}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Initial Entry</div>
            <div className="mt-1 font-semibold text-white">
              {formatNumber(strategy.initialEntryPrice)}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Entry Quantity</div>
            <div className="mt-1 font-semibold text-white">
              {formatNumber(strategy.entryQuantity)}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Take Profit</div>
            <div className="mt-1 font-semibold text-emerald-300">
              {strategy.takeProfitPercent}%
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Stop Loss</div>
            <div className="mt-1 font-semibold text-red-300">
              {strategy.stopLossPercent}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
          <div>
            <div className="text-[10px] uppercase text-zinc-500">Initial</div>
            <div className="mt-1 text-xs font-semibold text-white">
              {strategy.initialOrderStatus ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-zinc-500">TP</div>
            <div className="mt-1 text-xs font-semibold text-white">
              {strategy.takeProfitStatus ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-zinc-500">SL</div>
            <div className="mt-1 text-xs font-semibold text-white">
              {strategy.stopLossStatus ?? '—'}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Unable to load dashboard');
      }

      const data = (await response.json()) as {
        updatedAt: string;
        strategies: Strategy[];
      };

      setStrategies(data.strategies);
      setUpdatedAt(data.updatedAt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard error');
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              AutoNexa
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Strategy Dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Live progress for all DCA strategies. Refreshing every 2 seconds.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-semibold text-emerald-300">LIVE MONITOR</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {updatedAt
                ? `Updated ${new Date(updatedAt).toLocaleTimeString()}`
                : 'Connecting...'}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="text-xs text-zinc-500">Strategies</div>
            <div className="mt-1 text-2xl font-bold">{strategies.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="text-xs text-zinc-500">Enabled</div>
            <div className="mt-1 text-2xl font-bold text-emerald-300">
              {strategies.filter((x) => x.enabled === 1).length}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="text-xs text-zinc-500">Active Cycles</div>
            <div className="mt-1 text-2xl font-bold">
              {strategies.filter((x) => x.cycleStatus === 'active').length}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="text-xs text-zinc-500">DCA Executed</div>
            <div className="mt-1 text-2xl font-bold">
              {strategies.reduce((sum, x) => sum + x.executedDcaLevels, 0)}
            </div>
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          {(strategies.length ? strategies : symbols.map((symbol) => ({
            id: symbol,
            symbol,
            enabled: 0,
            balanceModeId: 'live',
            executionModeId: '—',
            takeProfitPercent: '—',
            stopLossPercent: '—',
            cycleId: null,
            cycleNumber: null,
            cycleStatus: null,
            initialEntryPrice: null,
            averageEntryPrice: null,
            entryQuantity: null,
            entryQuoteQuantity: null,
            cycleUpdatedAt: null,
            totalDcaLevels: 0,
            executedDcaLevels: 0,
            pendingDcaLevels: 0,
            initialOrderStatus: null,
            initialOrderPrice: null,
            initialExecutedQuantity: null,
            takeProfitStatus: null,
            takeProfitFillPrice: null,
            stopLossStatus: null,
            stopLossFillPrice: null,
            currentPrice: null,
          }))).map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
        </section>
      </div>
    </main>
  );
}
