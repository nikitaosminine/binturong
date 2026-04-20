import { useMemo, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { Thesis } from "@/lib/thesis";
import { TakePageHeader } from "@/components/take/take-page-header";
import { TakeToolbar, FilterTab } from "@/components/take/take-toolbar";
import { TakeThesisCard } from "@/components/take/take-thesis-card";
import { TakeInsightCard } from "@/components/take/take-insight-card";
import { TakeKpiSummary } from "@/components/take/take-kpi-summary";
import {
  BUCKET_ORDER,
  DateBucket,
  InsightStatus,
  bucketFor,
  insightFromTheses,
  rankScore,
  signalsFor,
} from "@/components/take/take-feed";

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

const FEED_FILTERS: ("All" | InsightStatus)[] = [
  "All",
  "At risk",
  "Supportive",
  "Watch",
  "Neutral",
];

export default function ThesesPage() {
  const { theses, openDrawer, openModal } = useOutletContext<ThesisContext>();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [feedFilter, setFeedFilter] = useState<"All" | InsightStatus>("All");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedThesis, setSelectedThesis] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);

  const insights = useMemo(() => insightFromTheses(theses), [theses]);

  const visibleInsights = useMemo(() => {
    let list = insights.filter((insight) => !dismissed.has(insight.id));

    if (feedFilter !== "All") {
      list = list.filter((insight) => insight.status === feedFilter);
    }

    if (selectedThesis) {
      list = list.filter((insight) => insight.thesisId === selectedThesis);
    }

    return list.sort((a, b) => {
      const thesisA = theses.find((thesis) => thesis.id === a.thesisId);
      const thesisB = theses.find((thesis) => thesis.id === b.thesisId);
      return rankScore(b, thesisB) - rankScore(a, thesisA);
    });
  }, [dismissed, feedFilter, insights, selectedThesis, theses]);

  const groupedInsights = useMemo(() => {
    const map = new Map<DateBucket, typeof visibleInsights>();
    for (const insight of visibleInsights) {
      const bucket = bucketFor(insight.hoursAgo);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(insight);
    }

    return BUCKET_ORDER.filter((bucket) => map.has(bucket)).map(
      (bucket) => [bucket, map.get(bucket)!] as const,
    );
  }, [visibleInsights]);

  const filteredTheses = useMemo(() => {
    let list = filter === "all" ? theses : theses.filter((thesis) => thesis.status === filter);

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

    return list;
  }, [filter, search, theses]);

  const highlightedThesis = useMemo(() => {
    if (!selectedInsight) return null;
    return insights.find((insight) => insight.id === selectedInsight)?.thesisId ?? null;
  }, [insights, selectedInsight]);

  const selectedThesisObj = selectedThesis
    ? theses.find((thesis) => thesis.id === selectedThesis)
    : null;

  const feedRef = useRef<HTMLDivElement>(null);
  const bucketRefs = useRef<Map<DateBucket, HTMLDivElement | null>>(new Map());

  const scrollToBucket = (bucket: DateBucket) => {
    const container = feedRef.current;
    const target = bucketRefs.current.get(bucket);
    if (!container || !target) return;
    const top = target.offsetTop - container.offsetTop;
    container.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="w-full space-y-6">
      <TakePageHeader onNewTake={() => openModal()} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="rounded-xl border border-border/50 bg-card p-4">
          <TakeKpiSummary
            theses={theses}
            insights={insights}
            onJumpToAtRisk={() => {
              setFeedFilter("At risk");
              setSelectedThesis(null);
            }}
          />

          <TakeToolbar
            tabs={FILTER_TABS}
            selectedFilter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
          />

          <div className="mt-3 flex flex-col gap-2">
            {filteredTheses.map((thesis) => (
              <TakeThesisCard
                key={thesis.id}
                thesis={thesis}
                signals={signalsFor(thesis.id, insights)}
                selected={selectedThesis === thesis.id}
                highlighted={highlightedThesis === thesis.id}
                onOpen={() => {
                  setSelectedThesis((prev) => (prev === thesis.id ? null : thesis.id));
                  openDrawer(thesis.id);
                  setSelectedInsight(null);
                }}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Trace feed
              </h2>
              <p className="text-xs text-muted-foreground">
                Signals mapped to your theses — review and act with context.
              </p>
            </div>
            <span className="rounded-md border border-border/50 bg-muted px-2 py-1 text-[10px] text-muted-foreground">
              Live · {visibleInsights.length}
            </span>
          </div>

          {selectedThesisObj && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs">
              <span className="text-primary">Scoped to:</span>
              <span className="font-medium">{selectedThesisObj.title}</span>
              <button
                onClick={() => setSelectedThesis(null)}
                className="ml-auto flex items-center gap-1 text-primary hover:opacity-80"
                aria-label="Clear scope"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          )}

          <div className="mb-3 flex flex-wrap gap-1.5">
            {FEED_FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFeedFilter(status)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  feedFilter === status
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/50 bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {groupedInsights.length > 1 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Jump to
              </span>
              {groupedInsights.map(([bucket, items]) => (
                <button
                  key={bucket}
                  onClick={() => scrollToBucket(bucket)}
                  className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  {bucket} <span className="text-muted-foreground">· {items.length}</span>
                </button>
              ))}
            </div>
          )}

          <div
            ref={feedRef}
            className="take-scrollbar flex max-h-[calc(100vh-320px)] flex-col gap-3 overflow-y-auto pr-1"
          >
            {groupedInsights.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-xs text-muted-foreground">
                No insights match this filter.
              </div>
            )}

            {groupedInsights.map(([bucket, items]) => (
              <div
                key={bucket}
                ref={(el) => {
                  bucketRefs.current.set(bucket, el);
                }}
                className="flex flex-col gap-2"
              >
                <button
                  onClick={() => scrollToBucket(bucket)}
                  className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-card/95 px-1 py-1 text-left backdrop-blur hover:text-primary"
                  aria-label={`Scroll to ${bucket}`}
                >
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {bucket}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">· {items.length}</span>
                  <div className="ml-2 h-px flex-1 bg-border/50" />
                </button>

                {items.map((insight) => (
                  <TakeInsightCard
                    key={insight.id}
                    insight={insight}
                    thesis={theses.find((thesis) => thesis.id === insight.thesisId)}
                    selected={selectedInsight === insight.id}
                    onSelect={() =>
                      setSelectedInsight((prev) => (prev === insight.id ? null : insight.id))
                    }
                    onDismiss={() => setDismissed((prev) => new Set(prev).add(insight.id))}
                    onThesisClick={() => {
                      setSelectedThesis((prev) =>
                        prev === insight.thesisId ? null : insight.thesisId,
                      );
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
