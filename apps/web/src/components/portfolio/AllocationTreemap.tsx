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
  const labelWidth = Math.max(0, width - 16);
  const labelHeight = Math.max(0, height - 12);
  const canShowLabel = labelWidth >= 38 && labelHeight >= 16;
  const showTwoLine = labelWidth >= 46 && labelHeight >= 34;
  const pctLabel = `${pct.toFixed(1)}%`;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        ry={6}
        style={{ fill, stroke: "var(--background)", strokeWidth: 2 }}
      />
      {canShowLabel && (
        <foreignObject x={x + 8} y={y + 6} width={labelWidth} height={labelHeight}>
          <div
            className="flex h-full min-w-0 flex-col overflow-hidden text-[12px] leading-tight"
            style={{ color: textFill, pointerEvents: "none" }}
          >
            {showTwoLine ? (
              <>
                <div className="truncate font-medium">{name}</div>
                <div className="truncate font-medium">{pctLabel}</div>
              </>
            ) : (
              <div className="truncate font-medium">
                {name} · {pctLabel}
              </div>
            )}
          </div>
        </foreignObject>
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
