import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getSector } from "@/lib/mock-data";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { toast } from "sonner";
import { TakeBadge } from "@/components/take-badge";
import { Thesis, thesesForTicker, thesesForPortfolio } from "@/lib/thesis";
import { EditHoldingModal } from "@/components/edit-holding-modal";
import { AddHoldingModal } from "@/components/add-holding-modal";
import { ThesisStack } from "@/components/thesis-stack/ThesisStack";
import { PortfolioChart } from "@/components/portfolio-chart";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuCheckboxItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Holding {
  id: string;
  ticker: string;
  name: string;
  isin: string | null;
  quantity: number;
  purchase_price: number;
  fees: number;
  purchase_date: string;
}

interface ThesisContext {
  theses: Thesis[];
  openDrawer: (id: string) => void;
  openModal: (
    thesis?: Thesis,
    prefill?: Partial<Pick<Thesis, "title" | "summary" | "tickers" | "horizon" | "tags">>,
  ) => void;
  updateThesis: (id: string, patch: Partial<Thesis>) => void;
}

function fmt$(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function StatCard({
  label,
  value,
  tone = "neutral",
  muted = false,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  muted?: boolean;
}) {
  const cls =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={`mt-1.5 text-lg font-semibold tabular-nums font-mono ${muted ? "text-foreground/70" : cls}`}
      >
        {value}
      </div>
    </div>
  );
}

// Sector allocation sidebar card
function SectorAllocationCard({ rows }: { rows: RowData[] }) {
  const [view, setView] = useState<"bar" | "pie">("bar");
  const total = rows.reduce((s, r) => s + r.total, 0);
  const bySector: Record<string, number> = {};
  rows.forEach((r) => {
    bySector[r.sector] = (bySector[r.sector] || 0) + r.total;
  });
  const entries = Object.entries(bySector).sort((a, b) => b[1] - a[1]);
  const colors = [
    "oklch(0.65 0.19 250)",
    "oklch(0.70 0.15 160)",
    "oklch(0.75 0.18 70)",
    "oklch(0.65 0.22 300)",
    "oklch(0.65 0.24 16)",
    "oklch(0.70 0.10 200)",
  ];
  const pieData = entries.map(([name, value], i) => ({
    name,
    value,
    fill: colors[i % colors.length],
  }));
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Sector allocation
        </div>
        {total > 0 && (
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView("bar")}
              className={`h-6 w-6 flex items-center justify-center transition-colors ${
                view === "bar"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
              aria-label="Bar view"
            >
              <BarChart3 className="h-3 w-3" />
            </button>
            <button
              onClick={() => setView("pie")}
              className={`h-6 w-6 flex items-center justify-center transition-colors ${
                view === "pie"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
              aria-label="Pie view"
            >
              <PieChartIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {total > 0 ? (
        view === "bar" ? (
          <>
            <div className="flex h-2 rounded-full overflow-hidden bg-[oklch(1_0_0/5%)]">
              {entries.map(([s, v], i) => (
                <div
                  key={s}
                  style={{ width: `${(v / total) * 100}%`, background: colors[i % colors.length] }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {entries.map(([s, v], i) => (
                <div key={s} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-2 w-2 rounded-sm shrink-0"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span className="flex-1 truncate">{s}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {((v / total) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-full h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={56}
                    paddingAngle={1}
                    stroke="none"
                  >
                    {pieData.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.18 0.03 264)",
                      border: "1px solid oklch(1 0 0 / 8%)",
                      borderRadius: "8px",
                      color: "oklch(0.96 0.005 264)",
                      fontSize: "11px",
                    }}
                    formatter={(v, name) => [
                      `${((Number(v) / total) * 100).toFixed(1)}%`,
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 w-full grid grid-cols-1 gap-1">
              {entries.map(([s, v], i) => (
                <div key={s} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-2 w-2 rounded-sm shrink-0"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span className="flex-1 truncate">{s}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {((v / total) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <p className="text-xs text-muted-foreground">No holdings data.</p>
      )}
    </div>
  );
}

// Column definitions
const ALL_COLUMNS = [
  { key: "name", label: "Asset", align: "left" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "cur", label: "Current", align: "right" },
  { key: "buy", label: "Cost", align: "right" },
  { key: "total", label: "Value", align: "right" },
  { key: "gl", label: "Gain/Loss", align: "right" },
  { key: "weight", label: "Weight", align: "right" },
  { key: "sector", label: "Sector", align: "left" },
  { key: "perf1D", label: "1D", align: "right" },
  { key: "perfYTD", label: "YTD", align: "right" },
  { key: "take", label: "Take", align: "center" },
] as const;

type ColKey = (typeof ALL_COLUMNS)[number]["key"];

interface RowData {
  id: string;
  ticker: string;
  name: string;
  isin: string | null;
  qty: number;
  cur: number;
  buy: number;
  total: number;
  gl: number;
  weight: number;
  sector: string;
  perf1D: number;
  perfYTD: number;
}

interface LiveQuote {
  ticker: string;
  currentPrice: number | null;
  change1dPercent: number | null;
  ytdChangePercent: number | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const DEFAULT_ORDER: ColKey[] = ALL_COLUMNS.map((c) => c.key);

function loadLS<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

export default function PortfolioDetailPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { theses, openDrawer, openModal, updateThesis } = useOutletContext<ThesisContext>();
  const [portfolio, setPortfolio] = useState<{ name: string; description: string | null } | null>(
    null,
  );
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});

  // Sort
  const [sortBy, setSortBy] = useState<string>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Column visibility
  const [hiddenCols, setHiddenCols] = useState<Set<ColKey>>(
    () => new Set<ColKey>(loadLS(`binturong.columns.hidden.${portfolioId}`, [])),
  );

  // Column order
  const [colOrder, setColOrder] = useState<ColKey[]>(() =>
    loadLS(`binturong.columns.order.${portfolioId}`, DEFAULT_ORDER),
  );

  // Drag state
  const dragKey = useRef<ColKey | null>(null);

  // Edit/delete modal
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [addHoldingOpen, setAddHoldingOpen] = useState(false);

  const load = async () => {
    const [pRes, hRes] = await Promise.all([
      supabase.from("portfolios").select("name, description").eq("id", portfolioId!).single(),
      supabase.from("holdings").select("*").eq("portfolio_id", portfolioId!),
    ]);
    if (pRes.error) toast.error("Failed to load portfolio");
    else setPortfolio(pRes.data);
    if (!hRes.error) setHoldings(hRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [portfolioId]);

  // Persist hidden cols
  useEffect(() => {
    saveLS(`binturong.columns.hidden.${portfolioId}`, Array.from(hiddenCols));
  }, [hiddenCols, portfolioId]);

  // Persist col order
  useEffect(() => {
    saveLS(`binturong.columns.order.${portfolioId}`, colOrder);
  }, [colOrder, portfolioId]);

  const totalValue = useMemo(
    () =>
      holdings.reduce((s, h) => {
        const livePrice = liveQuotes[h.ticker.toUpperCase()]?.currentPrice;
        const current = livePrice ?? h.purchase_price;
        return s + current * h.quantity;
      }, 0),
    [holdings, liveQuotes],
  );
  const totalCost = useMemo(
    () => holdings.reduce((s, h) => s + h.purchase_price * h.quantity, 0),
    [holdings],
  );
  const totalPL = totalValue - totalCost;
  const returnPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  const rows: RowData[] = useMemo(() => {
    const r = holdings.map((h) => {
      const live = liveQuotes[h.ticker.toUpperCase()];
      const cur = live?.currentPrice ?? h.purchase_price;
      const total = cur * h.quantity;
      const gl = (cur - h.purchase_price) * h.quantity;
      const weight = totalValue > 0 ? (total / totalValue) * 100 : 0;
      const perf1D = live?.change1dPercent ?? 0;
      const perfYTD = live?.ytdChangePercent ?? 0;
      return {
        id: h.id,
        ticker: h.ticker,
        name: h.name,
        isin: h.isin,
        qty: h.quantity,
        cur,
        buy: h.purchase_price,
        total,
        gl,
        weight,
        sector: getSector(h.ticker),
        perf1D,
        perfYTD,
        // keep original for modal
        _raw: h,
      } as RowData & { _raw: Holding };
    });

    r.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = (a as unknown as Record<string, unknown>)[sortBy];
      const bv = (b as unknown as Record<string, unknown>)[sortBy];
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return (((av as number) ?? 0) - ((bv as number) ?? 0)) * dir;
    });
    return r;
  }, [holdings, liveQuotes, totalValue, sortBy, sortDir]);

  useEffect(() => {
    const symbols = Array.from(
      new Set(holdings.map((h) => h.ticker.toUpperCase()).filter(Boolean)),
    );
    if (symbols.length === 0) {
      setLiveQuotes({});
      return;
    }

    let cancelled = false;

    const fetchQuotes = async () => {
      try {
        const params = encodeURIComponent(symbols.join(","));
        const res = await fetch(`${API_BASE_URL}/api/market/quotes?symbols=${params}`);
        if (!res.ok) throw new Error("Unable to fetch live quotes");
        const data = (await res.json()) as LiveQuote[];
        if (cancelled) return;
        const quoteMap = data.reduce<Record<string, LiveQuote>>((acc, quote) => {
          acc[quote.ticker] = quote;
          return acc;
        }, {});
        setLiveQuotes(quoteMap);
      } catch {
        if (!cancelled) toast.error("Failed to refresh market prices");
      }
    };

    fetchQuotes();
    const intervalId = window.setInterval(fetchQuotes, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [holdings]);

  const portfolioTickers = useMemo(
    () => Array.from(new Set(holdings.map((h) => h.ticker.toUpperCase()))),
    [holdings],
  );

  const visibleCols = colOrder.filter((k) => !hiddenCols.has(k));

  const handleSort = (key: string) => {
    if (key === "take") return;
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const toggleHide = (key: ColKey) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDragStart = (key: ColKey) => {
    dragKey.current = key;
  };
  const handleDrop = (targetKey: ColKey) => {
    if (!dragKey.current || dragKey.current === targetKey) return;
    setColOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(dragKey.current!);
      const toIdx = next.indexOf(targetKey);
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragKey.current!);
      return next;
    });
    dragKey.current = null;
  };

  const handleDelete = async (holding: Holding) => {
    if (!confirm(`Remove ${holding.name} from this portfolio?`)) return;
    const { error } = await supabase.from("holdings").delete().eq("id", holding.id);
    if (error) toast.error("Failed to delete holding");
    else {
      toast.success("Holding removed");
      load();
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading…
      </div>
    );

  if (!portfolio)
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Portfolio not found</p>
        <Link to="/portfolios" className="text-primary text-sm hover:underline mt-2 inline-block">
          Back to portfolios
        </Link>
      </div>
    );

  const linkedTheses = thesesForPortfolio(theses, portfolioTickers);

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* LEFT — portfolio (2/3) */}
      <div className="col-span-2 space-y-5 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Link to="/portfolios">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{portfolio.name}</h1>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-secondary text-secondary-foreground">
                  {holdings.length} holdings
                </span>
              </div>
              {portfolio.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{portfolio.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddHoldingOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />+ Add holding
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total value" value={fmt$(totalValue)} />
          <StatCard label="Cost basis" value={fmt$(totalCost)} muted />
          <StatCard
            label="Unrealized P/L"
            value={fmt$(totalPL)}
            tone={totalPL >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label="Return"
            value={fmtPct(returnPct)}
            tone={returnPct >= 0 ? "positive" : "negative"}
          />
        </div>

        {/* Chart + Sector allocation */}
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3 rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Portfolio value
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold font-mono tabular-nums">
                    {fmt$(totalValue)}
                  </span>
                  <span
                    className={`text-xs font-mono ${totalPL >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {fmt$(totalPL)} {fmtPct(returnPct)}
                  </span>
                </div>
              </div>
            </div>
            <PortfolioChart />
          </div>
          <div className="col-span-1">
            <SectorAllocationCard rows={rows} />
          </div>
        </div>

        {/* Holdings table — full width */}
        <div>
          <div className="rounded-lg border border-border/50 overflow-visible">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Holdings
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {rows.length} positions
              </div>
            </div>
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed">
                <colgroup>
                  {visibleCols.map((key) => {
                    const w: Record<string, string> = {
                      name: "28%",
                      qty: "5%",
                      cur: "8%",
                      buy: "8%",
                      total: "8%",
                      gl: "9%",
                      weight: "6%",
                      sector: "11%",
                      perf1D: "6%",
                      perfYTD: "6%",
                      take: "5%",
                    };
                    return <col key={key} style={{ width: w[key] ?? "auto" }} />;
                  })}
                  <col style={{ width: "5%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    {visibleCols.map((key) => {
                      const col = ALL_COLUMNS.find((c) => c.key === key)!;
                      const active = sortBy === key;
                      return (
                        <ContextMenu key={key}>
                          <ContextMenuTrigger asChild>
                            <th
                              draggable
                              onDragStart={() => handleDragStart(key)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDrop(key)}
                              onClick={() => handleSort(key)}
                              className={`text-[10px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none px-2 py-2 whitespace-nowrap ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${active ? "text-foreground" : ""}`}
                            >
                              {col.label}
                              {active && (
                                <span className="ml-1 text-[9px]">
                                  {sortDir === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </th>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-48">
                            {ALL_COLUMNS.map((c) => (
                              <ContextMenuCheckboxItem
                                key={c.key}
                                checked={!hiddenCols.has(c.key)}
                                onCheckedChange={() => toggleHide(c.key)}
                              >
                                {c.label}
                              </ContextMenuCheckboxItem>
                            ))}
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                    <th className="w-14 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleCols.length + 1}
                        className="text-center text-sm text-muted-foreground py-10"
                      >
                        No holdings — add one to get started
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const raw = holdings.find((h) => h.id === r.id)!;
                      const tickerTheses = thesesForTicker(theses, r.ticker);
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-border last:border-0 hover:bg-[oklch(1_0_0/2%)] transition-colors group"
                        >
                          {visibleCols.map((key) => {
                            const col = ALL_COLUMNS.find((c) => c.key === key)!;
                            const alignCls =
                              col.align === "right"
                                ? "text-right"
                                : col.align === "center"
                                  ? "text-center"
                                  : "";
                            return (
                              <td key={key} className={`px-2 py-2 text-[12px] ${alignCls}`}>
                                {key === "name" && (
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-[oklch(1_0_0/5%)] border border-border flex items-center justify-center shrink-0">
                                      <span className="font-mono text-[9px] font-semibold">
                                        {r.ticker.slice(0, 2)}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[12px] font-medium truncate">
                                        {r.name}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground font-mono">
                                        {r.ticker}
                                        {r.isin ? ` · ${r.isin}` : ""}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {key === "qty" && (
                                  <span className="font-mono tabular-nums">{r.qty}</span>
                                )}
                                {key === "cur" && (
                                  <span className="font-mono tabular-nums">{fmt$(r.cur)}</span>
                                )}
                                {key === "buy" && (
                                  <span className="font-mono tabular-nums text-muted-foreground">
                                    {fmt$(r.buy)}
                                  </span>
                                )}
                                {key === "total" && (
                                  <span className="font-mono tabular-nums font-medium">
                                    {fmt$(r.total)}
                                  </span>
                                )}
                                {key === "gl" && (
                                  <span
                                    className={`font-mono tabular-nums ${r.gl >= 0 ? "text-positive" : "text-negative"}`}
                                  >
                                    {r.gl >= 0 ? "+" : ""}
                                    {fmt$(r.gl)}
                                  </span>
                                )}
                                {key === "weight" && (
                                  <span className="font-mono tabular-nums text-muted-foreground">
                                    {r.weight.toFixed(1)}%
                                  </span>
                                )}
                                {key === "sector" && (
                                  <span className="text-muted-foreground">{r.sector}</span>
                                )}
                                {key === "perf1D" && (
                                  <span
                                    className={`font-mono tabular-nums ${r.perf1D >= 0 ? "text-positive" : "text-negative"}`}
                                  >
                                    {fmtPct(r.perf1D)}
                                  </span>
                                )}
                                {key === "perfYTD" && (
                                  <span
                                    className={`font-mono tabular-nums ${r.perfYTD >= 0 ? "text-positive" : "text-negative"}`}
                                  >
                                    {fmtPct(r.perfYTD)}
                                  </span>
                                )}
                                {key === "take" && (
                                  <div className="flex justify-center">
                                    <TakeBadge
                                      theses={tickerTheses}
                                      onOpen={openDrawer}
                                      onCreate={() => openModal(undefined, { tickers: [r.ticker] })}
                                    />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          {/* Row actions */}
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setEditingHolding(raw)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(raw)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Risk Watch — compact, grows downward */}
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Risk watch
            </div>
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-amber-500/10 text-amber-400 font-medium">
              coming soon
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            AI-powered risk monitoring will surface issues as markets move.
          </p>
        </div>

        {/* Add holding modal */}
        <AddHoldingModal
          open={addHoldingOpen}
          onOpenChange={setAddHoldingOpen}
          portfolioId={portfolioId!}
          onAdded={() => {
            setAddHoldingOpen(false);
            load();
          }}
        />

        {/* Edit holding modal */}
        {editingHolding && (
          <EditHoldingModal
            open={!!editingHolding}
            onOpenChange={(open) => {
              if (!open) setEditingHolding(null);
            }}
            holding={editingHolding}
            onUpdated={() => {
              setEditingHolding(null);
              load();
            }}
          />
        )}
      </div>

      {/* RIGHT — thesis stack (1/3) */}
      <aside className="col-span-1 min-w-0">
        <div className="sticky top-6">
          <ThesisStack theses={linkedTheses} onUpdate={updateThesis} onOpen={openDrawer} />
        </div>
      </aside>
    </div>
  );
}
