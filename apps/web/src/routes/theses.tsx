import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Thesis, ThesisStatus } from "@/lib/thesis";
import { TakePageHeader } from "@/components/take/take-page-header";
import { TakeStats } from "@/components/take/take-stats";
import { FilterTab, SortBy, TakeToolbar, ViewMode } from "@/components/take/take-toolbar";
import { TakeThesisCard } from "@/components/take/take-thesis-card";

interface ThesisContext {
  theses: Thesis[];
  openDrawer: (id: string) => void;
  openModal: (
    thesis?: Thesis,
    prefill?: Partial<Pick<Thesis, "title" | "summary" | "tickers" | "horizon" | "tags">>,
  ) => void;
}

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "playing-out", label: "Playing out" },
  { value: "invalidated", label: "Invalidated" },
  { value: "closed", label: "Closed" },
];

function sortTheses(theses: Thesis[], sortBy: SortBy) {
  const list = [...theses];

  if (sortBy === "recent") {
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (sortBy === "conviction") {
    const weight = { high: 3, med: 2, low: 1 } as const;
    return list.sort((a, b) => weight[b.conviction] - weight[a.conviction]);
  }

  if (sortBy === "signals") {
    return list.sort((a, b) => b.evidence.length - a.evidence.length);
  }

  return list.sort((a, b) => a.title.localeCompare(b.title));
}

export default function ThesesPage() {
  const { theses, openDrawer, openModal } = useOutletContext<ThesisContext>();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const stats = useMemo(
    () => ({
      total: theses.length,
      active: theses.filter((t) => t.status === "active").length,
      playingOut: theses.filter((t) => t.status === "playing-out").length,
      invalidated: theses.filter((t) => t.status === "invalidated").length,
    }),
    [theses],
  );

  const filtered = useMemo(() => {
    let list =
      filter === "all" ? theses : theses.filter((t) => t.status === (filter as ThesisStatus));

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (thesis) =>
          thesis.title.toLowerCase().includes(query) ||
          thesis.summary.toLowerCase().includes(query) ||
          thesis.tickers.some((ticker) => ticker.toLowerCase().includes(query)) ||
          thesis.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return sortTheses(list, sortBy);
  }, [theses, filter, search, sortBy]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <TakePageHeader onNewTake={() => openModal()} />

      <TakeStats
        total={stats.total}
        active={stats.active}
        playingOut={stats.playingOut}
        invalidated={stats.invalidated}
      />

      <TakeToolbar
        tabs={FILTER_TABS}
        selectedFilter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">No theses found</p>
          {search || filter !== "all" ? (
            <button
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
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
        <div
          className={
            viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-3"
          }
        >
          {filtered.map((thesis) => (
            <TakeThesisCard
              key={thesis.id}
              thesis={thesis}
              onOpen={() => openDrawer(thesis.id)}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
