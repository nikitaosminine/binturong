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

export function AllocationTreemap({ title, subtitle, data }: Props) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, d) => s + d.value, 0);
  const safeTotal = total || 1;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-hairline bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">{title}</div>
        {subtitle && <div className="text-[10px] text-foreground-muted">{subtitle}</div>}
      </div>
      <ul className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        {sorted.map((d, i) => {
          const pct = (d.value / safeTotal) * 100;
          const fill = PALETTE[i % PALETTE.length];

          return (
            <li key={d.name} className="min-w-0">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: fill }} />
                  <span className="truncate text-foreground">{d.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-foreground-muted">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: fill,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
