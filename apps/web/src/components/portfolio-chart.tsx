import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface PortfolioChartPoint {
  time: string;
  value: number;
}

interface PortfolioChartProps {
  data?: PortfolioChartPoint[];
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

type Range = "1M" | "3M" | "1Y" | "ALL";

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

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const [range, setRange] = useState<Range>("ALL");
  const points = data?.length ? data : DEFAULT_DATA;

  const filteredData = useMemo(() => {
    const rangeDef = RANGES.find((r) => r.id === range)!;
    if (!rangeDef.days) return points;
    const last = new Date(points[points.length - 1].time);
    const cutoff = new Date(last);
    cutoff.setDate(cutoff.getDate() - rangeDef.days);
    return points.filter((p) => new Date(p.time) >= cutoff);
  }, [points, range]);

  return (
    <div className="flex flex-col gap-3">
      {/* Range toggle buttons */}
      <div className="flex justify-end">
        <div className="flex gap-1 rounded-full border border-hairline bg-surface-2 p-1" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                range === r.id
                  ? "bg-accent-teal text-primary-foreground"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[240px] w-full">
        <AreaChart data={filteredData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-teal)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--accent-teal)" stopOpacity={0.02} />
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
            tickFormatter={(v: number) => fmt$(v)}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--accent-teal)", strokeOpacity: 0.4, strokeDasharray: "3 3" }}
            content={
              <ChartTooltipContent
                labelFormatter={(value: string) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                }
                formatter={(value: unknown) => [fmt$(value as number), "Portfolio value"]}
                indicator="dot"
              />
            }
          />
          <Area
            dataKey="value"
            type="natural"
            fill="url(#fillValue)"
            stroke="var(--accent-teal)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "var(--accent-teal)", stroke: "var(--background)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
