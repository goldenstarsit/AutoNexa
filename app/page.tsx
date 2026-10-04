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

function formatNumber(value: string | null, digits = 8): string {
  if (value === null || value === '') return '—';

  const number = Number(value);

  if (!Number.isFinite(number)) return value;

  return number.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatPrice(value: string | null): string {
  if (value === null || value === '') return '—';

  const number = Number(value);

  if (!Number.isFinite(number)) return value;

  return number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

function StatusPill({
  children,
  positive = false,
  warning = false,
}: {
  children: React.ReactNode;
  positive?: boolean;
  warning?: boolean;
}) {
  const className = positive
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
    : warning
      ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
      : 'border-white/10 bg-white/5 text-zinc-300';

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}

function ProgressBar({
  executed,
  total,
}: {
  executed: number;
  total: number;
}) {
  const progress =
    total > 0 ? Math.min(100, (executed / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          DCA Progress
        </span>

        <span className="text-sm font-bold text-white">
          {executed} / {total}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-1 text-right text-[10px] font-semibold text-zinc-500">
        {progress.toFixed(0)}%
      </div>
    </div>
  );
}

function DataItem({
  label,
  value,
  valueClassName = 'text-white',
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>

      <div className={`mt-1 text-sm font-bold ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const status = strategy.cycleStatus ?? 'waiting';

  const statusClass =
    status === 'active'
      ? 'text-emerald-300'
      : status === 'pending'
        ? 'text-amber-300'
        : status === 'completed'
          ? 'text-sky-300'
          : 'text-zinc-300';

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-black tracking-tight text-white">
              {strategy.symbol}
            </div>

            <div className="mt-1 text-xs text-zinc-500">
              Cycle {strategy.cycleNumber ?? '—'}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <StatusPill positive={strategy.enabled === 1}>
              {strategy.enabled === 1 ? 'LIVE' : 'DISABLED'}
            </StatusPill>

            <StatusPill warning={status === 'pending'}>
              {status}
            </StatusPill>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Live Price
          </div>

          <div className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {formatPrice(strategy.currentPrice)}
          </div>

          <div className="mt-1 text-xs text-emerald-300">
            MEXC live market price
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <ProgressBar
          executed={strategy.executedDcaLevels}
          total={strategy.totalDcaLevels}
        />

        <div className="grid grid-cols-2 gap-3">
          <DataItem
            label="Cycle Status"
            value={status.toUpperCase()}
            valueClassName={statusClass}
          />

          <DataItem
            label="Pending DCA"
            value={strategy.pendingDcaLevels}
          />

          <DataItem
            label="Initial Entry"
            value={formatPrice(strategy.initialEntryPrice)}
          />

          <DataItem
            label="Average Entry"
            value={formatPrice(strategy.averageEntryPrice)}
          />

          <DataItem
            label="Entry Quantity"
            value={formatNumber(strategy.entryQuantity)}
          />

          <DataItem
            label="Entry Value"
            value={formatNumber(strategy.entryQuoteQuantity, 4)}
          />

          <DataItem
            label="Take Profit"
            value={`${strategy.takeProfitPercent}%`}
            valueClassName="text-emerald-300"
          />

          <DataItem
            label="Stop Loss"
            value={`${strategy.stopLossPercent}%`}
            valueClassName="text-red-300"
          />
        </div>

        <div className="border-t border-white/10 pt-5">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
            Order Status
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-black/20 p-3 text-center">
              <div className="text-[9px] font-bold uppercase text-zinc-500">
                Initial
              </div>

              <div className="mt-1 text-xs font-bold text-white">
                {strategy.initialOrderStatus ?? '—'}
              </div>
            </div>

            <div className="rounded-2xl bg-black/20 p-3 text-center">
              <div className="text-[9px] font-bold uppercase text-zinc-500">
                Take Profit
              </div>

              <div className="mt-1 text-xs font-bold text-emerald-300">
                {strategy.takeProfitStatus ?? '—'}
              </div>
            </div>

            <div className="rounded-2xl bg-black/20 p-3 text-center">
              <div className="text-[9px] font-bold uppercase text-zinc-500">
                Stop Loss
              </div>

              <div className="mt-1 text-xs font-bold text-red-300">
                {strategy.stopLossStatus ?? '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs">
          <span className="text-zinc-500">
            {strategy.balanceModeId.toUpperCase()} · {strategy.executionModeId}
          </span>

          <span className="text-zinc-600">
            {strategy.cycleUpdatedAt
              ? new Date(strategy.cycleUpdatedAt).toLocaleTimeString()
              : '—'}
          </span>
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

      setStrategies(data.strategies.filter((strategy) => strategy.enabled === 1));
      setUpdatedAt(data.updatedAt);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Dashboard error',
      );
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 2000);

    return () => window.clearInterval(timer);
  }, [load]);

  const activeCycles = strategies.filter(
    (strategy) => strategy.cycleStatus === 'active',
  ).length;

  const totalExecutedDca = strategies.reduce(
    (sum, strategy) => sum + strategy.executedDcaLevels,
    0,
  );

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
                AutoNexa
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Live Strategy Monitor
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                Live prices and real strategy progress.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Live Monitor
                </span>
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                {updatedAt
                  ? `Updated ${new Date(updatedAt).toLocaleTimeString()}`
                  : 'Connecting...'}
              </div>
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
            <div className="text-xs text-zinc-500">Running</div>
            <div className="mt-1 text-2xl font-black text-emerald-300">
              {strategies.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="text-xs text-zinc-500">Active Cycles</div>
            <div className="mt-1 text-2xl font-black">
              {activeCycles}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="text-xs text-zinc-500">DCA Executed</div>
            <div className="mt-1 text-2xl font-black">
              {totalExecutedDca}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="text-xs text-zinc-500">Refresh</div>
            <div className="mt-1 text-2xl font-black">2s</div>
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
            />
          ))}
        </section>

        {!strategies.length && !error && (
          <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-10 text-center">
            <div className="text-lg font-bold text-white">
              No running strategies
            </div>

            <div className="mt-2 text-sm text-zinc-500">
              Waiting for an enabled strategy...
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
