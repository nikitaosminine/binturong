interface TakeStatsProps {
  total: number;
  active: number;
  playingOut: number;
  invalidated: number;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-medium tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function TakeStats({ total, active, playingOut, invalidated }: TakeStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Total" value={total} />
      <StatCard label="Active" value={active} />
      <StatCard label="Playing out" value={playingOut} />
      <StatCard label="Invalidated" value={invalidated} />
    </div>
  );
}
