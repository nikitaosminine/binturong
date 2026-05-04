import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Link, useParams, useOutletContext } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowBigUp,
  Check,
  CalendarDays,
  Columns3,
  Copy,
  FileJson,
  FileSpreadsheet,
  FileText,
  Keyboard,
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getSector } from "@/lib/mock-data";
import { toast } from "sonner";
import { TakeBadge } from "@/components/take-badge";
import { Thesis, thesesForTicker } from "@/lib/thesis";
import { EditHoldingModal } from "@/components/edit-holding-modal";
import { AddHoldingModal } from "@/components/add-holding-modal";
import { ImportTransactionsModal } from "@/components/import-transactions-modal";
import { PortfolioChart } from "@/components/portfolio-chart";
import { PrimaryTabs } from "@/components/primary-tabs";
import {
  TransactionDateRange,
  TransactionExportRow,
  TransactionHistoryTab,
} from "@/components/transaction-history-tab";
import { AllocationTreemap } from "@/components/portfolio/AllocationTreemap";
import { AllocationStackedBar } from "@/components/portfolio/AllocationStackedBar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuCheckboxItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Holding {
  id: string;
  ticker: string;
  name: string;
  isin: string | null;
  asset_type: string | null;
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

function normalizeAssetType(assetType: string | null, name = "", ticker = "") {
  const rawValue = assetType?.trim().toLowerCase();
  const value =
    rawValue && rawValue !== "other" && rawValue !== "n/a"
      ? rawValue
      : `${name} ${ticker}`.trim().toLowerCase();
  if (!value) return "Other";
  if (/\betf\b|exchange traded fund/.test(value)) return "ETF";
  if (/\bmutual\s*fund\b|\bfund\b|\buc\b|\bucits\b|open end fund/.test(value)) return "Fund";
  if (value.includes("bond") || value.includes("fixed")) return "Bonds";
  if (/\bequity\b|\bstock\b/.test(value)) return "Equity";
  if (value.includes("cash")) return "Cash";
  return "Other";
}

function inferSectorFromHolding(ticker: string, name: string, assetType: string | null): string {
  const symbol = ticker.toUpperCase();
  const baseTicker = symbol.split(".")[0];
  const label = name.toLowerCase();
  const type = normalizeAssetType(assetType, name, ticker);

  const explicitTickerSector: Record<string, string> = {
    "SU.PA": "Industrials",
    "LR.PA": "Industrials",
    "TTE.PA": "Energy",
    "ALSEM.PA": "Technology",
  };
  if (explicitTickerSector[symbol]) return explicitTickerSector[symbol];
  if (explicitTickerSector[baseTicker]) return explicitTickerSector[baseTicker];

  if (type === "ETF" || type === "Fund") {
    if (
      label.includes("tech") ||
      label.includes("technology") ||
      label.includes("nasdaq") ||
      label.includes("semiconductor")
    ) {
      return "Technology";
    }
    if (label.includes("energy")) return "Energy";
    if (label.includes("industrial")) return "Industrials";
    if (label.includes("financial") || label.includes("bank")) return "Financials";
    if (label.includes("healthcare") || label.includes("health")) return "Healthcare";
    if (
      label.includes("europe") ||
      label.includes("msci") ||
      label.includes("s&p") ||
      label.includes("stoxx") ||
      label.includes("world") ||
      label.includes("emerging") ||
      label.includes("japan") ||
      label.includes("topix") ||
      label.includes("screen")
    ) {
      return "Broad Market";
    }
    return "Broad Market";
  }

  if (label.includes("electric") || label.includes("industrial")) return "Industrials";
  if (label.includes("energy") || label.includes("totalenergies")) return "Energy";
  if (label.includes("technology") || label.includes("tech")) return "Technology";
  if (label.includes("bank") || label.includes("financial")) return "Financials";
  if (label.includes("health")) return "Healthcare";
  return "Other";
}

const ALL_COLUMNS = [
  { key: "name", label: "Asset", align: "left" },
  { key: "assetType", label: "Type", align: "left" },
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
  assetType: string;
  perf1D: number;
  perfYTD: number;
}

interface LiveQuote {
  ticker: string;
  currentPrice: number | null;
  change1dPercent: number | null;
  ytdChangePercent: number | null;
  sector?: string | null;
  assetType?: string | null;
}

type ExportValue = string | number | null;
type ExportRow = Record<string, ExportValue>;
type DatePreset = "30D" | "90D" | "YTD" | "All";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? "https://binturong-api.nikita-osminine.workers.dev"
    : "http://localhost:8787");

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

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getPresetRange(preset: DatePreset): TransactionDateRange {
  if (preset === "All") return { from: null, to: null };
  const today = new Date();
  if (preset === "YTD") {
    return { from: `${today.getFullYear()}-01-01`, to: toIsoDate(today) };
  }
  return { from: toIsoDate(addDays(today, preset === "30D" ? -30 : -90)), to: toIsoDate(today) };
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportToCsv(filename: string, rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: ExportValue) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => escape(row[key])).join(",")),
  ].join("\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

function exportToJson(filename: string, rows: ExportRow[]) {
  downloadBlob(filename, new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
}

function exportToXlsx(filename: string, rows: ExportRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
  XLSX.writeFile(workbook, filename);
}

function PerfCell({ value, money }: { value: number; money?: boolean }) {
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
  const tone = value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-foreground-muted";
  const text = money
    ? `${value > 0 ? "+" : value < 0 ? "−" : ""}${fmt$(Math.abs(value))}`
    : fmtPct(value);
  return (
    <span className={`inline-flex items-center justify-end gap-1 tabular-nums ${tone}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {text}
    </span>
  );
}

export default function PortfolioDetailPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { theses, openDrawer, openModal } = useOutletContext<ThesisContext>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<{
    id: string;
    name: string;
    description: string | null;
    cash_value: number;
  } | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});

  const [sortBy, setSortBy] = useState<string>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [hiddenCols, setHiddenCols] = useState<Set<ColKey>>(
    () => new Set<ColKey>(loadLS(`binturong.columns.hidden.${portfolioId}`, [])),
  );

  const [colOrder, setColOrder] = useState<ColKey[]>(() => {
    const saved = loadLS(`binturong.columns.order.${portfolioId}`, DEFAULT_ORDER);
    const missing = DEFAULT_ORDER.filter((k) => !saved.includes(k));
    return [...saved, ...missing];
  });

  const dragKey = useRef<ColKey | null>(null);

  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [addHoldingOpen, setAddHoldingOpen] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashAction, setCashAction] = useState<"deposit" | "withdraw">("deposit");
  const [cashAmount, setCashAmount] = useState("");
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"holdings" | "transactions">("holdings");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionDateRange, setTransactionDateRange] = useState<TransactionDateRange>({
    from: null,
    to: null,
  });
  const [transactionDateLabel, setTransactionDateLabel] = useState("Date range");
  const [transactionCalendarRange, setTransactionCalendarRange] = useState<DateRange | undefined>();
  const [transactionExportRows, setTransactionExportRows] = useState<TransactionExportRow[]>([]);
  const columnModifierSelectRef = useRef(false);

  const load = useCallback(async () => {
    const [pRes, hRes] = await Promise.all([
      supabase
        .from("portfolios")
        .select("id, name, description, cash_value")
        .eq("id", portfolioId!)
        .single(),
      supabase.from("holdings").select("*").eq("portfolio_id", portfolioId!),
    ]);
    if (pRes.error) toast.error("Failed to load portfolio");
    else setPortfolio(pRes.data);
    if (!hRes.error) setHoldings(hRes.data || []);
    setLoading(false);
  }, [portfolioId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (portfolioId) localStorage.setItem("binturong.last-portfolio-id", portfolioId);
  }, [portfolioId]);

  useEffect(() => {
    saveLS(`binturong.columns.hidden.${portfolioId}`, Array.from(hiddenCols));
  }, [hiddenCols, portfolioId]);

  useEffect(() => {
    saveLS(`binturong.columns.order.${portfolioId}`, colOrder);
  }, [colOrder, portfolioId]);

  const holdingsValue = useMemo(
    () =>
      holdings.reduce((s, h) => {
        const livePrice = liveQuotes[h.ticker.toUpperCase()]?.currentPrice;
        const current = livePrice ?? h.purchase_price;
        return s + current * h.quantity;
      }, 0),
    [holdings, liveQuotes],
  );
  const holdingsCost = useMemo(
    () => holdings.reduce((s, h) => s + h.purchase_price * h.quantity, 0),
    [holdings],
  );
  const cashValue = portfolio?.cash_value ?? 0;
  const totalValue = holdingsValue + cashValue;
  const totalCost = holdingsCost + cashValue;
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
        sector:
          live?.sector && live.sector !== "Other"
            ? live.sector
            : inferSectorFromHolding(h.ticker, h.name, live?.assetType ?? h.asset_type) ||
              getSector(h.ticker),
        assetType: normalizeAssetType(live?.assetType ?? h.asset_type, h.name, h.ticker),
        perf1D,
        perfYTD,
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

  // Allocation data for charts
  const sectorData = useMemo(() => {
    const bySector: Record<string, number> = {};
    rows.forEach((r) => {
      bySector[r.sector] = (bySector[r.sector] || 0) + r.total;
    });
    return Object.entries(bySector)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [rows]);

  const assetTypeData = useMemo(() => {
    const byType: Record<string, number> = {};
    rows.forEach((r) => {
      byType[r.assetType] = (byType[r.assetType] || 0) + r.total;
    });
    if (cashValue > 0) byType.Cash = (byType.Cash || 0) + cashValue;
    return Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [rows, cashValue]);

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

  const visibleCols = colOrder.filter((k) => !hiddenCols.has(k));
  const holdingsExportRows = useMemo<ExportRow[]>(() => {
    return rows.map((row) => {
      const values: Record<ColKey, ExportValue> = {
        name: row.name,
        assetType: row.assetType,
        qty: row.qty,
        cur: row.cur,
        buy: row.buy,
        total: row.total,
        gl: row.gl,
        weight: `${row.weight.toFixed(1)}%`,
        sector: row.sector,
        perf1D: `${row.perf1D.toFixed(2)}%`,
        perfYTD: `${row.perfYTD.toFixed(2)}%`,
        take: thesesForTicker(theses, row.ticker).length,
      };
      return visibleCols.reduce<ExportRow>((acc, key) => {
        const column = ALL_COLUMNS.find((col) => col.key === key)!;
        acc[column.label] = values[key];
        return acc;
      }, {});
    });
  }, [rows, theses, visibleCols]);

  const activeExportRows = activeTab === "holdings" ? holdingsExportRows : transactionExportRows;
  const activeExportName =
    activeTab === "holdings"
      ? `${portfolio?.name ?? "portfolio"}-holdings`
      : `${portfolio?.name ?? "portfolio"}-transactions`;
  const hasTransactionDateFilter = transactionDateLabel !== "Date range";

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

  const submitCashChange = async () => {
    if (!portfolio) return;
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const currentCash = portfolio.cash_value ?? 0;
    const delta = cashAction === "deposit" ? amount : -amount;
    const nextCash = currentCash + delta;
    if (nextCash < 0) {
      toast.error("Withdrawal exceeds available cash");
      return;
    }
    try {
      setCashSubmitting(true);
      const { error } = await supabase
        .from("portfolios")
        .update({ cash_value: nextCash })
        .eq("id", portfolio.id);
      if (error) throw error;
      setPortfolio((prev) => (prev ? { ...prev, cash_value: nextCash } : prev));
      toast.success(cashAction === "deposit" ? "Cash deposited" : "Cash withdrawn");
      setCashAmount("");
      setCashDialogOpen(false);
    } catch {
      toast.error("Failed to update cash");
    } finally {
      setCashSubmitting(false);
    }
  };

  const copyIsin = async (rowId: string, isin: string | null) => {
    if (!isin) {
      toast.error("No ISIN available for this holding");
      return;
    }
    try {
      await navigator.clipboard.writeText(isin);
      setCopiedId(rowId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy ISIN");
    }
  };

  const applyTransactionPreset = (preset: DatePreset) => {
    setTransactionDateRange(getPresetRange(preset));
    setTransactionDateLabel(preset === "All" ? "All" : preset);
    setTransactionCalendarRange(undefined);
  };

  const applyManualTransactionRange = (range: DateRange | undefined) => {
    setTransactionCalendarRange(range);
    const nextRange = {
      from: range?.from ? toIsoDate(range.from) : null,
      to: range?.to ? toIsoDate(range.to) : range?.from ? toIsoDate(range.from) : null,
    };
    setTransactionDateRange(nextRange);
    if (nextRange.from && nextRange.to)
      setTransactionDateLabel(`${nextRange.from} - ${nextRange.to}`);
    else setTransactionDateLabel("Date range");
  };

  const resetTransactionDateRange = () => {
    setTransactionDateRange({ from: null, to: null });
    setTransactionDateLabel("Date range");
    setTransactionCalendarRange(undefined);
  };

  const markColumnModifierSelect = (event: { shiftKey: boolean }) => {
    columnModifierSelectRef.current = event.shiftKey;
  };

  const handleColumnSelect = (event: Event) => {
    if (columnModifierSelectRef.current) event.preventDefault();
    columnModifierSelectRef.current = false;
  };

  const handleExport = (format: "csv" | "xlsx" | "json") => {
    if (activeExportRows.length === 0) {
      toast.error("No rows to export");
      return;
    }
    const safeName = activeExportName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (format === "csv") exportToCsv(`${safeName}.csv`, activeExportRows);
    if (format === "xlsx") exportToXlsx(`${safeName}.xlsx`, activeExportRows);
    if (format === "json") exportToJson(`${safeName}.json`, activeExportRows);
    toast.success(`${activeTab === "holdings" ? "Holdings" : "Transactions"} exported`);
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center text-sm text-foreground-muted">
        Loading…
      </div>
    );

  if (!portfolio)
    return (
      <div className="py-24 text-center">
        <p className="text-foreground-muted">Portfolio not found</p>
        <Link
          to="/portfolios"
          className="mt-2 inline-block text-sm text-foreground hover:underline"
        >
          Back to portfolios
        </Link>
      </div>
    );

  const ROW_HEIGHT = 460;

  const KPIS = [
    { label: "Total value", value: fmt$(totalValue) },
    { label: "Cash", value: fmt$(cashValue), muted: cashValue === 0 },
    { label: "Cost basis", value: fmt$(totalCost) },
    {
      label: "Unrealized P/L",
      value: totalPL === 0 ? "—" : fmt$(totalPL),
      tone: totalPL > 0 ? "positive" : totalPL < 0 ? "negative" : undefined,
      muted: totalPL === 0,
    },
    {
      label: "Return",
      value: returnPct === 0 ? "—" : fmtPct(returnPct),
      tone: returnPct > 0 ? "positive" : returnPct < 0 ? "negative" : undefined,
      muted: returnPct === 0,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PrimaryTabs />

      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-6 pb-8 pt-4">
        {/* Compact header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/portfolios">
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-md text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <h1 className="text-xl font-semibold tracking-tight">{portfolio.name}</h1>
            <span className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground-muted">
              {holdings.length} holdings
            </span>
            {portfolio.description && (
              <span className="text-xs text-foreground-muted">{portfolio.description}</span>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                setCashAction("deposit");
                setCashDialogOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add cash
            </button>
          </div>
        </div>

        {/* Main 2-col grid: chart | allocations */}
        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
          style={{ gridAutoRows: "minmax(0, auto)" }}
        >
          {/* Left: KPI strip + chart */}
          <div className="flex flex-col gap-6" style={{ height: ROW_HEIGHT }}>
            {/* KPI strip */}
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-2xl border border-hairline bg-surface px-4 py-2.5">
              <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {KPIS.map((kpi, i) => (
                  <div
                    key={kpi.label}
                    className={`flex items-baseline gap-2 ${i > 0 ? "border-l border-hairline pl-5" : ""}`}
                  >
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">
                      {kpi.label}
                    </dt>
                    <dd
                      className={`text-sm font-semibold tabular-nums ${
                        kpi.muted
                          ? "text-foreground-muted"
                          : kpi.tone === "positive"
                            ? "text-positive"
                            : kpi.tone === "negative"
                              ? "text-negative"
                              : "text-foreground"
                      }`}
                    >
                      {kpi.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Chart card */}
            <div className="min-h-0 flex-1 rounded-2xl border border-hairline bg-surface p-5">
              <div className="mb-3 text-[11px] uppercase tracking-widest text-foreground-muted">
                Portfolio value
              </div>
              <PortfolioChart portfolioId={portfolioId} />
            </div>
          </div>

          {/* Right: allocation charts */}
          <div className="flex flex-col gap-6" style={{ height: ROW_HEIGHT }}>
            <div className="min-h-0 flex-[1.4]">
              <AllocationTreemap
                title="Allocation · By sector"
                subtitle={`${sectorData.length} sectors`}
                data={sectorData}
              />
            </div>
            <div className="min-h-0 flex-1">
              <AllocationStackedBar
                title="Allocation · By asset type"
                subtitle={`${assetTypeData.length} asset classes`}
                data={assetTypeData}
              />
            </div>
          </div>
        </div>

        {/* 1px divider above holdings table */}
        <div className="border-t border-hairline" />

        {/* Holdings and transaction history */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <div className="rounded-2xl border border-hairline bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
              <TabsList className="h-9 rounded-full border border-hairline bg-surface-2 p-0.5">
                <TabsTrigger
                  value="holdings"
                  className="h-8 rounded-full px-4 text-[11px] uppercase tracking-[0.1em] data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=inactive]:text-foreground-muted"
                >
                  Holdings
                  <span className="ml-1.5 tabular-nums opacity-70">{rows.length}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="transactions"
                  className="h-8 rounded-full px-4 text-[11px] uppercase tracking-[0.1em] data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=inactive]:text-foreground-muted"
                >
                  Transactions
                </TabsTrigger>
              </TabsList>

              {activeTab === "holdings" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-background px-4"
                    >
                      <Columns3 className="h-3.5 w-3.5" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="flex items-center justify-between gap-3">
                        <span>Columns</span>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-normal text-foreground-muted">
                          <Keyboard className="h-3 w-3" />
                          Hold
                          <ArrowBigUp className="h-3 w-3" />
                          for multi-select
                        </span>
                      </DropdownMenuLabel>
                      {ALL_COLUMNS.map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.key}
                          checked={!hiddenCols.has(column.key)}
                          onCheckedChange={() => toggleHide(column.key)}
                          onPointerDown={markColumnModifierSelect}
                          onKeyDown={markColumnModifierSelect}
                          onSelect={handleColumnSelect}
                        >
                          {column.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <div className="relative min-w-[220px] flex-1 sm:flex-none">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
                    <Input
                      value={transactionSearch}
                      onChange={(event) => setTransactionSearch(event.target.value)}
                      placeholder="Search..."
                      className="h-9 rounded-full bg-background pl-9 text-xs"
                    />
                  </div>
                  <Popover>
                    <div className="inline-flex h-9 items-center rounded-full border border-input bg-background shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-full items-center gap-2 rounded-l-full px-4 text-xs font-medium"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          {transactionDateLabel}
                        </button>
                      </PopoverTrigger>
                      {hasTransactionDateFilter && (
                        <button
                          type="button"
                          onClick={resetTransactionDateRange}
                          className="mr-1 grid h-7 w-7 place-items-center rounded-full text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                          aria-label="Clear transaction date filter"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {(["30D", "90D", "YTD", "All"] as DatePreset[]).map((preset) => (
                          <Button
                            key={preset}
                            type="button"
                            variant={transactionDateLabel === preset ? "default" : "outline"}
                            size="sm"
                            className="h-7 rounded-full px-3 text-[11px]"
                            onClick={() => applyTransactionPreset(preset)}
                          >
                            {preset}
                          </Button>
                        ))}
                      </div>
                      <Calendar
                        mode="range"
                        selected={transactionCalendarRange}
                        onSelect={applyManualTransactionRange}
                        numberOfMonths={2}
                      />
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetTransactionDateRange}
                        >
                          Reset
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {activeTab === "holdings" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAddHoldingOpen(true)}
                    className="rounded-full px-4"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add holding
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setImportOpen(true)}
                    className="rounded-full px-4"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Import transactions
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      aria-label="Table export options"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Export</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => handleExport("csv")}>
                        <FileText className="h-4 w-4" />
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                        <FileSpreadsheet className="h-4 w-4" />
                        XLSX
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("json")}>
                        <FileJson className="h-4 w-4" />
                        JSON
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <FileText className="h-4 w-4" />
                      PDF coming soon
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <TabsContent value="holdings" className="m-0">
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <colgroup>
                    {visibleCols.map((key) => {
                      const w: Record<string, string> = {
                        name: "340px",
                        assetType: "96px",
                        qty: "64px",
                        cur: "104px",
                        buy: "104px",
                        total: "104px",
                        gl: "112px",
                        weight: "78px",
                        sector: "110px",
                        perf1D: "76px",
                        perfYTD: "76px",
                        take: "52px",
                      };
                      return <col key={key} style={{ width: w[key] ?? "auto" }} />;
                    })}
                    <col style={{ width: "52px" }} />
                  </colgroup>
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.1em] text-foreground-muted">
                      {visibleCols.map((key) => {
                        const col = ALL_COLUMNS.find((c) => c.key === key)!;
                        const active = sortBy === key;
                        const isAllocationStart = key === "total";
                        const isPerformanceStart = key === "gl";
                        const isTake = key === "take";
                        return (
                          <ContextMenu key={key}>
                            <ContextMenuTrigger asChild>
                              <th
                                draggable
                                onDragStart={() => handleDragStart(key)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(key)}
                                onClick={() => handleSort(key)}
                                className={`cursor-pointer select-none whitespace-nowrap px-3 py-3 font-medium transition-colors ${
                                  col.align === "right"
                                    ? "text-right"
                                    : col.align === "center"
                                      ? "text-center"
                                      : "text-left"
                                } ${active ? "text-foreground" : ""} ${
                                  isAllocationStart || isPerformanceStart || isTake
                                    ? "border-l border-hairline/60"
                                    : ""
                                } ${key === "name" ? "px-5" : ""}`}
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
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleCols.length + 1}
                          className="py-10 text-center text-sm text-foreground-muted"
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
                            className="border-t border-hairline/60 transition-colors hover:bg-surface-2/60 group"
                          >
                            {visibleCols.map((key) => {
                              const col = ALL_COLUMNS.find((c) => c.key === key)!;
                              const alignCls =
                                col.align === "right"
                                  ? "text-right"
                                  : col.align === "center"
                                    ? "text-center"
                                    : "";
                              const isAllocationStart = key === "total";
                              const isPerformanceStart = key === "gl";
                              const isTake = key === "take";
                              return (
                                <td
                                  key={key}
                                  className={`px-3 py-3 text-[12px] ${alignCls} ${
                                    isAllocationStart || isPerformanceStart || isTake
                                      ? "border-l border-hairline/60"
                                      : ""
                                  } ${key === "name" ? "px-5" : ""}`}
                                >
                                  {key === "name" && (
                                    <div className="flex items-center gap-3">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className={`h-8 w-8 rounded-md border border-hairline bg-surface-2 transition-colors ${
                                                copiedId === r.id
                                                  ? "border-foreground/40 text-foreground"
                                                  : "text-foreground-muted"
                                              }`}
                                              onClick={() => copyIsin(r.id, r.isin)}
                                              aria-label="Copy ISIN"
                                            >
                                              {copiedId === r.id ? (
                                                <Check className="h-3.5 w-3.5" />
                                              ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>
                                              {copiedId === r.id
                                                ? "Copied!"
                                                : r.isin
                                                  ? "Copy ISIN"
                                                  : "No ISIN"}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <div className="min-w-0">
                                        <div className="truncate font-medium text-foreground">
                                          {r.name}
                                        </div>
                                        <div className="text-[10px] tabular-nums text-foreground-muted">
                                          {r.ticker}
                                          {r.isin ? ` · ${r.isin}` : ""}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {key === "qty" && <span className="tabular-nums">{r.qty}</span>}
                                  {key === "assetType" && (
                                    <span className="text-foreground-muted">{r.assetType}</span>
                                  )}
                                  {key === "cur" && (
                                    <span className="tabular-nums">{fmt$(r.cur)}</span>
                                  )}
                                  {key === "buy" && (
                                    <span className="tabular-nums text-foreground-muted">
                                      {fmt$(r.buy)}
                                    </span>
                                  )}
                                  {key === "total" && (
                                    <span className="tabular-nums font-medium">
                                      {fmt$(r.total)}
                                    </span>
                                  )}
                                  {key === "gl" && <PerfCell value={r.gl} money />}
                                  {key === "weight" && (
                                    <span className="tabular-nums text-foreground-muted">
                                      {r.weight.toFixed(1)}%
                                    </span>
                                  )}
                                  {key === "sector" && (
                                    <span className="text-foreground-muted">{r.sector}</span>
                                  )}
                                  {key === "perf1D" && <PerfCell value={r.perf1D} />}
                                  {key === "perfYTD" && <PerfCell value={r.perfYTD} />}
                                  {key === "take" && (
                                    <div className="flex justify-center">
                                      <TakeBadge
                                        theses={tickerTheses}
                                        onOpen={openDrawer}
                                        onCreate={() =>
                                          openModal(undefined, { tickers: [r.ticker] })
                                        }
                                      />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            {/* Row actions */}
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
            </TabsContent>

            <TabsContent value="transactions" className="m-0 p-4">
              <TransactionHistoryTab
                portfolioId={portfolioId!}
                searchQuery={transactionSearch}
                dateRange={transactionDateRange}
                onDeleted={() => load()}
                onExportRowsChange={setTransactionExportRows}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Modals */}
        <AddHoldingModal
          open={addHoldingOpen}
          onOpenChange={setAddHoldingOpen}
          portfolioId={portfolioId!}
          onAdded={() => {
            setAddHoldingOpen(false);
            load();
          }}
        />

        <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {cashAction === "deposit" ? "Deposit cash" : "Withdraw cash"}
              </DialogTitle>
              <DialogDescription>
                Current cash balance: <span className="font-mono">{fmt$(cashValue)}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={cashAction === "deposit" ? "default" : "outline"}
                  onClick={() => setCashAction("deposit")}
                >
                  Deposit
                </Button>
                <Button
                  type="button"
                  variant={cashAction === "withdraw" ? "default" : "outline"}
                  onClick={() => setCashAction("withdraw")}
                >
                  Withdraw
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cash-amount">Amount</Label>
                <Input
                  id="cash-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCashDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={cashSubmitting} onClick={submitCashChange}>
                {cashSubmitting
                  ? "Saving…"
                  : cashAction === "deposit"
                    ? "Deposit cash"
                    : "Withdraw cash"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <ImportTransactionsModal
          open={importOpen}
          onOpenChange={setImportOpen}
          portfolioId={portfolioId!}
          onImported={() => {
            setActiveTab("transactions");
            load();
          }}
        />
      </div>
    </div>
  );
}
