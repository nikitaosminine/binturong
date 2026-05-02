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

export function AllocationStackedBar({ title, subtitle, data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-hairline bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">{title}</div>
        {subtitle && <div className="text-[10px] text-foreground-muted">{subtitle}</div>}
      </div>

      <div className="flex h-9 w-full overflow-hidden rounded-lg border border-hairline bg-surface-2">
        {sorted.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <div
              key={d.name}
              className="relative flex items-center justify-center text-[11px] font-medium tabular-nums transition-all"
              style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length], color: "oklch(0.16 0.012 240)" }}
              title={`${d.name} · ${pct.toFixed(1)}%`}
            >
              {pct >= 6 ? `${pct.toFixed(1)}%` : null}
            </div>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-1 flex-col justify-center gap-2 text-xs">
        {sorted.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <li key={d.name} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="truncate text-foreground">{d.name}</span>
              </span>
              <span className="tabular-nums text-foreground-muted">{pct.toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
