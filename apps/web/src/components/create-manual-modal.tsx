import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_STOCKS } from "@/lib/mock-data";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Holding {
  ticker: string;
  name: string;
  isin: string | null;
  date: Date | undefined;
  price: string;
  quantity: string;
  fees: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const emptyHolding = (): Holding => ({
  ticker: "", name: "", isin: null, date: undefined, price: "", quantity: "", fees: "0",
});

export function CreateManualModal({ open, onOpenChange, onCreated }: Props) {
  const [portfolioName, setPortfolioName] = useState("");
  const [description, setDescription] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([emptyHolding()]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof MOCK_STOCKS>([]);
  const [activeSearch, setActiveSearch] = useState<number | null>(null);

  const searchStocks = (query: string, index: number) => {
    const updated = [...holdings];
    updated[index] = { ...updated[index], ticker: query, name: "" };
    setHoldings(updated);
    setActiveSearch(index);
    if (query.length > 0) {
      setSearchResults(
        MOCK_STOCKS.filter(
          (s) =>
            s.ticker.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5)
      );
    } else {
      setSearchResults([]);
    }
  };

  const selectStock = (stock: (typeof MOCK_STOCKS)[0], index: number) => {
    const updated = [...holdings];
    updated[index] = { ...updated[index], ticker: stock.ticker, name: stock.name, isin: stock.isin };
    setHoldings(updated);
    setSearchResults([]);
    setActiveSearch(null);
  };

  const updateHolding = (index: number, field: keyof Holding, value: any) => {
    const updated = [...holdings];
    updated[index] = { ...updated[index], [field]: value };
    setHoldings(updated);
  };

  const removeHolding = (index: number) => {
    if (holdings.length === 1) return;
    setHoldings(holdings.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!portfolioName.trim()) return;
    const valid = holdings.every((h) => h.ticker && h.date && h.price && h.quantity);
    if (!valid) { toast.error("Fill all required fields for each holding"); return; }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: portfolio, error: pErr } = await supabase
        .from("portfolios")
        .insert({ name: portfolioName.trim(), description: description.trim() || null, user_id: user.id })
        .select()
        .single();
      if (pErr) throw pErr;

      const rows = holdings.map((h) => ({
        portfolio_id: portfolio.id,
        ticker: h.ticker.toUpperCase(),
        name: h.name || h.ticker,
        isin: h.isin,
        purchase_date: h.date ? format(h.date, "yyyy-MM-dd") : "",
        purchase_price: parseFloat(h.price) || 0,
        quantity: parseFloat(h.quantity) || 0,
        fees: parseFloat(h.fees) || 0,
      }));

      const { error: hErr } = await supabase.from("holdings").insert(rows);
      if (hErr) throw hErr;

      toast.success("Portfolio created successfully");
      setPortfolioName("");
      setDescription("");
      setHoldings([emptyHolding()]);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Failed to create portfolio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create manually</DialogTitle>
          <DialogDescription>Add your holdings one by one.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Portfolio name *</Label>
              <Input placeholder="My Portfolio" value={portfolioName} onChange={(e) => setPortfolioName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Holdings</Label>
            {holdings.map((h, i) => (
              <div key={i} className="rounded-lg border border-border/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">#{i + 1}</span>
                  {holdings.length > 1 && (
                    <button onClick={() => removeHolding(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Label className="text-xs">Stock *</Label>
                  <Input
                    placeholder="Search by ticker or name..."
                    value={h.ticker}
                    onChange={(e) => searchStocks(e.target.value, i)}
                    onFocus={() => { setActiveSearch(i); if (h.ticker) searchStocks(h.ticker, i); }}
                    onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                  />
                  {h.name && <p className="text-xs text-muted-foreground mt-0.5">{h.name}</p>}
                  {activeSearch === i && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 bg-popover shadow-lg">
                      {searchResults.map((s) => (
                        <button
                          key={s.ticker}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                          onMouseDown={() => selectStock(s, i)}
                        >
                          <span className="font-medium">{s.ticker}</span>
                          <span className="text-xs text-muted-foreground">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Purchase date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left text-sm font-normal", !h.date && "text-muted-foreground")}>
                          {h.date ? format(h.date, "MMM dd, yyyy") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={h.date}
                          onSelect={(d) => updateHolding(i, "date", d)}
                          disabled={(d) => d > new Date()}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs">Price *</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={h.price} onChange={(e) => updateHolding(i, "price", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Quantity *</Label>
                    <Input type="number" step="0.01" placeholder="0" value={h.quantity} onChange={(e) => updateHolding(i, "quantity", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Fees</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={h.fees} onChange={(e) => updateHolding(i, "fees", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setHoldings([...holdings, emptyHolding()])} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add another holding
            </Button>
          </div>

          <Button onClick={handleSubmit} disabled={!portfolioName.trim() || loading} className="w-full">
            {loading ? "Creating..." : "Create portfolio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
