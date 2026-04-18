import { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { Thesis, ThesisConviction, ThesisStatus } from "@/lib/thesis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ThesisContext {
  theses: Thesis[];
  openDrawer: (id: string) => void;
  openModal: (thesis?: Thesis) => void;
}

const STATUS_LABELS: Record<ThesisStatus, string> = {
  active: "Active",
  "playing-out": "Playing out",
  invalidated: "Invalidated",
  closed: "Closed",
};

const STATUS_CLASSES: Record<ThesisStatus, string> = {
  active: "bg-primary/15 text-primary",
  "playing-out": "bg-positive/15 text-positive",
  invalidated: "bg-negative/15 text-negative",
  closed: "bg-muted text-muted-foreground",
};

const CONVICTION_COLORS: Record<ThesisConviction, string> = {
  low: "oklch(0.60 0.02 264)",
  med: "oklch(0.78 0.14 75)",
  high: "oklch(0.80 0.15 250)",
};

function ConvictionDots({ level }: { level: ThesisConviction }) {
  const filled = level === "low" ? 1 : level === "med" ? 2 : 3;
  const color = CONVICTION_COLORS[level];
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i < filled ? color : "oklch(0.30 0.02 264)" }}
        />
      ))}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ThesisCard({ thesis, onOpen }: { thesis: Thesis; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-lg border border-border/50 bg-card p-4 hover:border-border transition-colors space-y-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[thesis.status]}`}>
            {STATUS_LABELS[thesis.status]}
          </span>
          <ConvictionDots level={thesis.conviction} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{thesis.horizon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold leading-snug">{thesis.title}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{thesis.summary}</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {thesis.tickers.map((tk) => (
            <span key={tk} className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
              {tk}
            </span>
          ))}
        </div>
        {thesis.evidence.length > 0 && (
          <span className="text-xs text-muted-foreground">{thesis.evidence.length} signals</span>
        )}
      </div>
    </button>
  );
}

type FilterTab = "all" | ThesisStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "playing-out", label: "Playing out" },
  { value: "invalidated", label: "Invalidated" },
  { value: "closed", label: "Closed" },
];

export default function ThesesPage() {
  const { theses, openDrawer, openModal } = useOutletContext<ThesisContext>();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => ({
    total: theses.length,
    active: theses.filter((t) => t.status === "active").length,
    playingOut: theses.filter((t) => t.status === "playing-out").length,
    invalidated: theses.filter((t) => t.status === "invalidated").length,
  }), [theses]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? theses : theses.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.tickers.some((tk) => tk.toLowerCase().includes(q)) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [theses, filter, search]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">The Take</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your investment theses and conviction log</p>
        </div>
        <Button size="sm" onClick={() => openModal()}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New take
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Playing out" value={stats.playingOut} />
        <StatCard label="Invalidated" value={stats.invalidated} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === tab.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search theses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">No theses found</p>
          {search || filter !== "all" ? (
            <button
              onClick={() => { setSearch(""); setFilter("all"); }}
              className="text-xs text-primary hover:underline mt-2"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={() => openModal()}
              className="text-xs text-primary hover:underline mt-2"
            >
              Add your first take
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((thesis) => (
            <ThesisCard key={thesis.id} thesis={thesis} onOpen={() => openDrawer(thesis.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
