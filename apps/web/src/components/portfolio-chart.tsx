import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? "https://binturong-api.nikita-osminine.workers.dev"
    : "http://localhost:8787");

interface ChartSeries {
  date: string;
  total_value: number;
  cash_balance: number;
  securities_value: number;
  simple_return_pct: number;
  twr_pct: number;
}

export interface PortfolioChartPoint {
  time: string;
  value: number;
}

interface PortfolioChartProps {
  data?: PortfolioChartPoint[];
  portfolioId?: string;
}

const DEFAULT_DATA: PortfolioChartPoint[] = [
  { time: "2026-01-02", value: 102400 },
  { time: "2026-01-15", value: 103200 },
  { time: "2026-02-03", value: 104800 },
  { time: "2026-02-18", value: 106300 },
  { time: "2026-03-02", value: 105700 },
  { time: "2026-03-15", value: 107900 },
  { time: "2026-04-01", value: 109200 },
  { time: "2026-04-10", value: 110350 },
  { time: "2026-04-17", value: 111400 },
];

type Mode = "value" | "simple" | "twr";
type Range = "1M" | "3M" | "1Y" | "ALL";
type View = "line" | "returns";
type BarPeriod = "M" | "Q" | "Y";

interface ReturnBar {
  label: string;
  returnPct: number;
}

const RANGES: { id: Range; label: string; days: number | null }[] = [
  { id: "1M", label: "Monthly", days: 30 },
  { id: "3M", label: "Quarterly", days: 90 },
  { id: "1Y", label: "Yearly", days: 365 },
  { id: "ALL", label: "All time", days: null },
];

const chartConfig = {
  value: {
    label: "Portfolio value",
    color: "var(--accent-teal)",
  },
} satisfies ChartConfig;

function fmtValue(n: number, mode: Mode) {
  if (mode === "value") {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function keepLastPerPeriod(
  points: PortfolioChartPoint[],
  keyFn: (point: PortfolioChartPoint) => string,
): PortfolioChartPoint[] {
  const map = new Map<string, PortfolioChartPoint>();
  for (const point of points) map.set(keyFn(point), point);
  return [...map.values()];
}

function downsample(points: PortfolioChartPoint[], range: Range): PortfolioChartPoint[] {
  if (range === "1M") return points;
  if (range === "3M") {
    return keepLastPerPeriod(points, (point) => {
      const date = new Date(point.time);
      const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
      return `${date.getFullYear()}-W${week}`;
    });
  }
  return keepLastPerPeriod(points, (point) => point.time.slice(0, 7));
}

function computeReturns(points: PortfolioChartPoint[], period: BarPeriod): ReturnBar[] {
  const keyFn = (time: string): string => {
    if (period === "M") return time.slice(0, 7);
    if (period === "Q") {
      const [year, month] = time.split("-").map(Number);
      return `${year}-Q${Math.ceil(month / 3)}`;
    }
    return time.slice(0, 4);
  };

  const groups = new Map<string, PortfolioChartPoint[]>();
  const sortedPoints = [...points].sort((a, b) => a.time.localeCompare(b.time));
  for (const point of sortedPoints) {
    const key = keyFn(point.time);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(point);
  }

  const bars: ReturnBar[] = [];
  for (const [key, group] of groups.entries()) {
    const startFactor = 1 + group[0].value / 100;
    const endFactor = 1 + group[group.length - 1].value / 100;
    if (startFactor <= 0) continue;
    let label = key;
    if (period === "M") {
      const [year, month] = key.split("-").map(Number);
      label = new Date(year, month - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    }
    bars.push({ label, returnPct: (endFactor / startFactor - 1) * 100 });
  }
  return bars;
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export function PortfolioChart({ data, portfolioId }: PortfolioChartProps) {
  const [range, setRange] = useState<Range>("ALL");
  const [mode, setMode] = useState<Mode>("value");
  const [view, setView] = useState<View>("line");
  const [barPeriod, setBarPeriod] = useState<BarPeriod>("M");
  const [chartSeries, setChartSeries] = useState<ChartSeries[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChartData = useCallback(async () => {
    if (!portfolioId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/portfolios/${portfolioId}/chart`, {
        headers: await authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load chart");
      setChartSeries(body.series ?? []);
    } catch {
      setChartSeries([]);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  useEffect(() => {
    if (!portfolioId) return;
    const channel = supabase
      .channel(`snapshots:${portfolioId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_snapshots",
          filter: `portfolio_id=eq.${portfolioId}`,
        },
        () => fetchChartData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [portfolioId, fetchChartData]);

  const points: PortfolioChartPoint[] = useMemo(() => {
    if (data?.length) return data;
    if (!chartSeries.length) return DEFAULT_DATA;
    return chartSeries.map((point) => ({
      time: point.date,
      value:
        mode === "value"
          ? point.total_value
          : mode === "simple"
            ? point.simple_return_pct
            : point.twr_pct,
    }));
  }, [chartSeries, data, mode]);

  const twrPoints: PortfolioChartPoint[] = useMemo(() => {
    if (!chartSeries.length) return [];
    return chartSeries.map((point) => ({
      time: point.date,
      value: point.twr_pct,
    }));
  }, [chartSeries]);

  const lineData = useMemo(() => {
    const rangeDef = RANGES.find((r) => r.id === range)!;
    let filtered = points;
    if (rangeDef.days) {
      const last = new Date(points[points.length - 1].time);
      const cutoff = new Date(last);
      cutoff.setDate(cutoff.getDate() - rangeDef.days);
      filtered = points.filter((point) => new Date(point.time) >= cutoff);
    }
    return downsample(filtered, range);
  }, [points, range]);

  const barData = useMemo(() => computeReturns(twrPoints, barPeriod), [twrPoints, barPeriod]);

  const barPeriods: { id: BarPeriod; label: string }[] = [
    { id: "M", label: "Monthly" },
    { id: "Q", label: "Quarterly" },
    { id: "Y", label: "Yearly" },
  ];

  const fmtPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex gap-1 rounded-full border border-hairline bg-surface-2 p-1"
          role="tablist"
          aria-label="Chart view"
        >
          {(["line", "returns"] as View[]).map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={view === item}
              onClick={() => setView(item)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                view === item
                  ? "bg-foreground text-background"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {item === "line" ? "Line" : "Returns"}
            </button>
          ))}
        </div>

        {view === "line" && (
          <div
            className="flex gap-1 rounded-full border border-hairline bg-surface-2 p-1"
            role="tablist"
            aria-label="Chart mode"
          >
            {(
              [
                ["value", "Value"],
                ["simple", "Return"],
                ["twr", "TWR"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  mode === id
                    ? "bg-foreground text-background"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div
          className="flex gap-1 rounded-full border border-hairline bg-surface-2 p-1"
          role="tablist"
          aria-label={view === "line" ? "Time range" : "Return period"}
        >
          {view === "line"
            ? RANGES.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={range === item.id}
                  onClick={() => setRange(item.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    range === item.id
                      ? "bg-foreground text-background"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))
            : barPeriods.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={barPeriod === item.id}
                  onClick={() => setBarPeriod(item.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    barPeriod === item.id
                      ? "bg-foreground text-background"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[240px] w-full animate-pulse rounded-lg bg-surface-2" />
      ) : view === "returns" ? (
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <BarChart data={barData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={8}
              tick={{ fill: "var(--foreground-muted)", fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={52}
              tick={{ fill: "var(--foreground-muted)", fontSize: 10 }}
              tickFormatter={(value: number) => `${value.toFixed(0)}%`}
            />
            <ReferenceLine y={0} stroke="var(--hairline)" />
            <ChartTooltip
              cursor={{ fill: "var(--hairline)", fillOpacity: 0.5 }}
              content={
                <ChartTooltipContent
                  formatter={(value: unknown) => [fmtPct(value as number), "Return"]}
                  indicator="dot"
                />
              }
            />
            <Bar dataKey="returnPct" radius={[3, 3, 0, 0]}>
              {barData.map((entry, index) => (
                <Cell
                  key={`${entry.label}-${index}`}
                  fill={entry.returnPct >= 0 ? "var(--accent-teal)" : "var(--destructive)"}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <AreaChart data={lineData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--chart-accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={40}
              tick={{ fill: "var(--foreground-muted)", fontSize: 10 }}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={72}
              tick={{ fill: "var(--foreground-muted)", fontSize: 10 }}
              tickFormatter={(value: number) => fmtValue(value, mode)}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--chart-accent)", strokeOpacity: 0.4, strokeDasharray: "3 3" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value: string) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                  formatter={(value: unknown) => [fmtValue(value as number, mode), ""]}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillValue)"
              stroke="var(--chart-accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--chart-accent)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
