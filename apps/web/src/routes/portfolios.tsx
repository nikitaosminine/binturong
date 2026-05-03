import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CreateCsvModal } from "@/components/create-csv-modal";
import { CreateManualModal } from "@/components/create-manual-modal";
import { EditPortfolioModal } from "@/components/edit-portfolio-modal";
import { MOCK_PRICES, generateChartData } from "@/lib/mock-data";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Holding {
  id: string;
  ticker: string;
  quantity: number;
  purchase_price: number;
}

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  cash_value: number | null;
  holdings: Holding[];
}

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function holdingsValue(holdings: Holding[]) {
  return holdings.reduce((s, h) => s + (MOCK_PRICES[h.ticker] ?? h.purchase_price) * h.quantity, 0);
}

function holdingsCost(holdings: Holding[]) {
  return holdings.reduce((s, h) => s + h.purchase_price * h.quantity, 0);
}

function StatCard({ label, value, tone = "neutral", muted = false }: {
  label: string; value: string; tone?: "positive" | "negative" | "neutral"; muted?: boolean;
}) {
  const cls = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-lg font-semibold tabular-nums font-mono ${muted ? "text-foreground/70" : cls}`}>{value}</div>
    </div>
  );
}

function Sparkline({ points, positive }: { points: { value: number }[]; positive: boolean }) {
  return (
    <div style={{ width: 110, height: 34 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={positive ? "oklch(0.72 0.19 145)" : "oklch(0.65 0.2 25)"}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PortfolioCard({
  portfolio,
  onClick,
  onEdit,
  onDelete,
}: {
  portfolio: Portfolio;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cash = portfolio.cash_value ?? 0;
  const val = holdingsValue(portfolio.holdings) + cash;
  const cost = holdingsCost(portfolio.holdings) + cash;
  const pl = val - cost;
  const plPct = cost > 0 ? (pl / cost) * 100 : 0;
  const positive = pl >= 0;

  // Use a numeric seed derived from portfolio id characters
  const seed = portfolio.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const sparkPoints = useMemo(() => generateChartData("1M", seed % 100), [seed]);

  const topHoldings = [...portfolio.holdings]
    .sort((a, b) => (MOCK_PRICES[b.ticker] ?? b.purchase_price) * b.quantity - (MOCK_PRICES[a.ticker] ?? a.purchase_price) * a.quantity)
    .slice(0, 3);
  const extra = portfolio.holdings.length - 3;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="text-left group w-full rounded-lg border border-border/50 bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer"
    >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold tracking-tight truncate">{portfolio.name}</div>
            {portfolio.description && (
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{portfolio.description}</div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Open actions for ${portfolio.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-[17px] font-semibold font-mono tabular-nums">{fmt$(val)}</div>
            <div className={`text-[11px] font-mono ${positive ? "text-positive" : "text-negative"}`}>
              {fmt$(pl)} · {fmtPct(plPct)}
            </div>
          </div>
          <Sparkline points={sparkPoints} positive={positive} />
        </div>

        {portfolio.holdings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 flex-wrap">
            {topHoldings.map((h) => (
              <span key={h.ticker} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-secondary text-secondary-foreground">
                {h.ticker}
              </span>
            ))}
            {extra > 0 && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-secondary text-secondary-foreground">
                +{extra}
              </span>
            )}
          </div>
        )}
    </div>
  );
}

function AddCard({ onNewCsv, onNewManual }: { onNewCsv: () => void; onNewManual: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-center min-h-[180px] hover:border-primary/40 transition-colors">
      <div className="h-9 w-9 rounded-full bg-[oklch(1_0_0/4%)] border border-border flex items-center justify-center">
        <Plus className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-xs text-muted-foreground">Add another portfolio</div>
      <div className="flex gap-1.5 mt-1">
        <Button variant="outline" size="sm" onClick={onNewCsv}>Import CSV</Button>
        <Button size="sm" onClick={onNewManual}>Manual</Button>
      </div>
    </div>
  );
}

export default function PortfoliosPage() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvOpen, setCsvOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  const fetchPortfolios = async () => {
    const { data, error } = await supabase
      .from("portfolios")
      .select("*, holdings(*)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load portfolios");
    } else {
      setPortfolios((data as Portfolio[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPortfolios(); }, []);

  const onCreated = () => { setCsvOpen(false); setManualOpen(false); fetchPortfolios(); };
  const handleEditPortfolio = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setEditOpen(true);
  };

  const handleDeletePortfolio = async (portfolio: Portfolio) => {
    if (!confirm(`Delete ${portfolio.name}? This will remove all holdings in this portfolio.`)) return;

    const { error: holdingsError } = await supabase
      .from("holdings")
      .delete()
      .eq("portfolio_id", portfolio.id);
    if (holdingsError) {
      toast.error("Failed to delete portfolio holdings");
      return;
    }

    const { error } = await supabase
      .from("portfolios")
      .delete()
      .eq("id", portfolio.id);
    if (error) {
      toast.error("Failed to delete portfolio");
      return;
    }

    toast.success("Portfolio deleted");
    fetchPortfolios();
  };

  const totalValue = useMemo(
    () => portfolios.reduce((s, p) => s + holdingsValue(p.holdings) + (p.cash_value ?? 0), 0),
    [portfolios],
  );
  const totalCash = useMemo(() => portfolios.reduce((s, p) => s + (p.cash_value ?? 0), 0), [portfolios]);
  const totalCost = useMemo(
    () => portfolios.reduce((s, p) => s + holdingsCost(p.holdings) + (p.cash_value ?? 0), 0),
    [portfolios],
  );
  const totalPL    = totalValue - totalCost;
  const returnPct  = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Portfolios</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage and track your investments across accounts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Import CSV
          </Button>
          <Button size="sm" onClick={() => setManualOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Create manually
          </Button>
        </div>
      </div>

      {portfolios.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          <StatCard label="Total value"    value={fmt$(totalValue)} />
          <StatCard label="Cash value"     value={fmt$(totalCash)} muted />
          <StatCard label="Total cost"     value={fmt$(totalCost)} muted />
          <StatCard label="Unrealized P/L" value={fmt$(totalPL)}   tone={totalPL >= 0 ? "positive" : "negative"} />
          <StatCard label="Return"         value={fmtPct(returnPct)} tone={returnPct >= 0 ? "positive" : "negative"} />
        </div>
      )}

      {portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-full bg-[oklch(1_0_0/4%)] border border-border flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold">No portfolios yet</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">Create your first portfolio by importing a CSV or adding holdings manually.</p>
          <div className="flex gap-2 mt-5">
            <Button variant="outline" onClick={() => setCsvOpen(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />Create from CSV
            </Button>
            <Button onClick={() => setManualOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Create manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((p) => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              onClick={() => navigate(`/portfolios/${p.id}`)}
              onEdit={() => handleEditPortfolio(p)}
              onDelete={() => handleDeletePortfolio(p)}
            />
          ))}
          <AddCard onNewCsv={() => setCsvOpen(true)} onNewManual={() => setManualOpen(true)} />
        </div>
      )}

      <CreateCsvModal    open={csvOpen}    onOpenChange={setCsvOpen}    onCreated={onCreated} />
      <CreateManualModal open={manualOpen} onOpenChange={setManualOpen} onCreated={onCreated} />
      <EditPortfolioModal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingPortfolio(null);
        }}
        portfolio={editingPortfolio}
        onSaved={fetchPortfolios}
      />
    </div>
  );
}
