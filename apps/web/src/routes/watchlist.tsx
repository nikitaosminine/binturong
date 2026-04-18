import { useState, useEffect } from "react";
import { Plus, Trash2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_STOCKS, MOCK_PRICES, get1DPerf } from "@/lib/mock-data";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WatchlistItem {
  id: string;
  ticker: string;
  isin: string | null;
  name: string;
  added_at: string;
}

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function WatchlistPage() {
  const [items, setItems]         = useState<WatchlistItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<typeof MOCK_STOCKS>([]);
  const [showResults, setShowResults] = useState(false);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("watchlist_items")
      .select("*")
      .order("added_at", { ascending: false });
    if (error) toast.error("Failed to load watchlist");
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const search = (q: string) => {
    setQuery(q);
    if (q.length > 0) {
      setResults(
        MOCK_STOCKS.filter(
          (s) =>
            s.ticker.toLowerCase().includes(q.toLowerCase()) ||
            s.name.toLowerCase().includes(q.toLowerCase())
        ).slice(0, 6)
      );
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const addToWatchlist = async (stock: typeof MOCK_STOCKS[0]) => {
    setQuery("");
    setShowResults(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("watchlist_items").insert({
      user_id: user.id,
      ticker: stock.ticker,
      isin: stock.isin,
      name: stock.name,
    });
    if (error) {
      if (error.code === "23505") toast.error(`${stock.ticker} is already on your watchlist`);
      else toast.error("Failed to add to watchlist");
    } else {
      toast.success(`${stock.ticker} added to watchlist`);
      fetchItems();
    }
  };

  const removeItem = async (item: WatchlistItem) => {
    const { error } = await supabase.from("watchlist_items").delete().eq("id", item.id);
    if (error) toast.error("Failed to remove item");
    else { toast.success(`${item.ticker} removed`); fetchItems(); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-xs text-muted-foreground mt-1">Track stocks you're interested in.</p>
        </div>
      </div>

      {/* Search / add */}
      <div className="relative max-w-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search to add a stock…"
              value={query}
              onChange={(e) => search(e.target.value)}
              onFocus={() => { if (query) search(query); }}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
            {showResults && results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 bg-popover shadow-lg">
                {results.map((s) => (
                  <button
                    key={s.ticker}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                    onMouseDown={() => addToWatchlist(s)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono text-xs">{s.ticker}</span>
                      <span className="text-muted-foreground text-xs">{s.name}</span>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-full bg-[oklch(1_0_0/4%)] border border-border flex items-center justify-center mb-4">
            <Bookmark className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold">Your watchlist is empty</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Search above to add stocks you want to keep an eye on.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider">Asset</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-right">Price</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-right">1D</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">ISIN</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Added</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const price = MOCK_PRICES[item.ticker];
                const perf1D = get1DPerf(item.ticker, 1);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-[oklch(1_0_0/5%)] border border-border flex items-center justify-center shrink-0">
                          <span className="font-mono text-[10px] font-semibold">{item.ticker.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="text-[13px] font-medium">{item.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{item.ticker}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">
                      {price ? fmt$(price) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-mono tabular-nums text-sm ${perf1D >= 0 ? "text-positive" : "text-negative"}`}>
                      {fmtPct(perf1D)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{item.isin || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.added_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
