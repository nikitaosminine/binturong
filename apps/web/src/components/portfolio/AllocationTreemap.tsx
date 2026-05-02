import { Treemap, ResponsiveContainer } from "recharts";

export type AllocationDatum = { name: string; value: number };

type Props = {
  title: string;
  subtitle?: string;
  data: AllocationDatum[];
};

const PALETTE = [
  "var(--alloc-1)",
  "var(--alloc-2)",
  "var(--alloc-3)",
  "var(--alloc-4)",
  "var(--alloc-5)",
  "var(--alloc-6)",
];

type ContentProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
  total: number;
};

function TreemapNode(props: ContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name, value = 0, total } = props;
  const fill = PALETTE[index % PALETTE.length];
  const pct = total > 0 ? (value / total) * 100 : 0;
  const showLabel = width > 60 && height > 36;
  const showPct = width > 50 && height > 24;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        ry={6}
        style={{ fill, fillOpacity: 0.9, stroke: "var(--background)", strokeWidth: 2 }}
      />
      {showLabel && (
        <text
          x={x + 10}
          y={y + 18}
          fill="oklch(0.16 0.012 240)"
          fontSize={11}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {name}
        </text>
      )}
      {showPct && (
        <text
          x={x + 10}
          y={y + (showLabel ? 33 : 18)}
          fill="oklch(0.16 0.012 240)"
          fontSize={10}
          fillOpacity={0.75}
          style={{ pointerEvents: "none" }}
          className="tabular-nums"
        >
          {pct.toFixed(1)}%
        </text>
      )}
    </g>
  );
}

export function AllocationTreemap({ title, subtitle, data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-hairline bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">{title}</div>
        {subtitle && <div className="text-[10px] text-foreground-muted">{subtitle}</div>}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="value"
            stroke="var(--background)"
            isAnimationActive={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={(<TreemapNode total={total} />) as any}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
