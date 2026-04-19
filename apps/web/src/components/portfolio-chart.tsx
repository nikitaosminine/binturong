import { useEffect, useMemo, useRef, useState } from "react";

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

type Range = "1W" | "1M" | "3M" | "1Y" | "ALL";

function filterDataByRange(points: PortfolioChartPoint[], range: Range): PortfolioChartPoint[] {
  if (range === "ALL" || points.length === 0) return points;

  const lastDate = new Date(points[points.length - 1].time);
  const from = new Date(lastDate);

  if (range === "1W") from.setDate(from.getDate() - 7);
  if (range === "1M") from.setMonth(from.getMonth() - 1);
  if (range === "3M") from.setMonth(from.getMonth() - 3);
  if (range === "1Y") from.setFullYear(from.getFullYear() - 1);

  return points.filter((point) => new Date(point.time) >= from);
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const [range, setRange] = useState<Range>("1M");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const points = data?.length ? data : DEFAULT_DATA;

  const filteredData = useMemo(() => filterDataByRange(points, range), [points, range]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let remove = false;
    let frameId = 0;
    let chart: {
      remove: () => void;
      applyOptions: (options: { width: number }) => void;
      addAreaSeries: (opts: Record<string, unknown>) => { setData: (data: unknown[]) => void };
      timeScale: () => { fitContent: () => void };
    } | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      const importFromUrl = new Function("u", "return import(u)") as (
        u: string,
      ) => Promise<{
        createChart: (el: HTMLElement, opts: Record<string, unknown>) => typeof chart;
      }>;
      const lightweightCharts = await importFromUrl(
        "https://esm.sh/gh/nikitaosminine/lightweight-charts",
      );
      if (remove || !container) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;

      chart = lightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 300,
        layout: {
          background: { color: "transparent" },
          textColor: "oklch(0.72 0.02 264)",
        },
        grid: {
          vertLines: { color: "oklch(1 0 0 / 4%)" },
          horzLines: { color: "oklch(1 0 0 / 4%)" },
        },
        rightPriceScale: {
          borderColor: "oklch(1 0 0 / 8%)",
        },
        timeScale: {
          borderColor: "oklch(1 0 0 / 8%)",
        },
        handleScroll: false,
        handleScale: false,
      });

      if (!chart) return;
      const areaSeries = chart.addAreaSeries({
        lineColor: "#22ab94",
        topColor: "rgba(34, 171, 148, 0.24)",
        bottomColor: "rgba(34, 171, 148, 0.03)",
        lineWidth: 2,
      });

      const seriesData = filteredData.map((point) => ({
        time: point.time,
        value: point.value,
      }));
      console.log("[PortfolioChart] seriesData", seriesData);
      areaSeries.setData(seriesData);
      chart.timeScale().fitContent();

      resizeObserver = new ResizeObserver(() => {
        if (!container || !chart) return;
        chart.applyOptions({ width: container.clientWidth });
      });
      resizeObserver.observe(container);
    };

    frameId = window.requestAnimationFrame(() => {
      setup();
    });

    return () => {
      remove = true;
      window.cancelAnimationFrame(frameId);
      if (resizeObserver) resizeObserver.disconnect();
      if (chart) chart.remove();
    };
  }, [filteredData]);

  useEffect(() => {
    console.log("[PortfolioChart] filteredData length", filteredData.length, filteredData);
  }, [filteredData]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {(["1W", "1M", "3M", "1Y", "ALL"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-2.5 h-7 text-[11px] font-medium transition-colors ${
                range === value
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: 300 }} />
    </div>
  );
}
