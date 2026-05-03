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

const TEXT_PALETTE = [
  "var(--alloc-1-text)",
  "var(--alloc-2-text)",
  "var(--alloc-3-text)",
  "var(--alloc-4-text)",
  "var(--alloc-5-text)",
  "var(--alloc-6-text)",
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
  const textFill = TEXT_PALETTE[index % TEXT_PALETTE.length];
  const pct = total > 0 ? (value / total) * 100 : 0;
  const showLabel = width > 44 && height > 22;
  const showPct = showLabel && width > 64 && height > 38;
  const clipId = `clip-alloc-${index}`;

  return (
    <g>
      <clipPath id={clipId}>
        <rect x={x + 2} y={y + 2} width={Math.max(0, width - 4)} height={Math.max(0, height - 4)} />
      </clipPath>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        ry={6}
        style={{ fill, stroke: "var(--background)", strokeWidth: 2 }}
      />
      {showLabel && (
        <text
          x={x + 10}
          y={y + (showPct ? 17 : Math.min(18, height - 8))}
          fill={textFill}
          fontSize={11}
          fontWeight={500}
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          clipPath={`url(#${clipId})`}
          style={{ pointerEvents: "none" }}
        >
          {name}
        </text>
      )}
      {showPct && (
        <text
          x={x + 10}
          y={y + (showLabel ? 32 : 18)}
          fill={textFill}
          fontSize={10}
          fontWeight={400}
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fillOpacity={0.8}
          clipPath={`url(#${clipId})`}
          style={{ pointerEvents: "none" }}
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
