import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_STOCKS, CSV_TEMPLATE } from "@/lib/mock-data";
import Papa from "papaparse";
import { toast } from "sonner";

interface AssetSearchResult {
  ticker: string;
  name: string;
  exchange: string;
  assetType: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? "https://binturong-api.nikita-osminine.workers.dev"
    : "http://localhost:8787");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateCsvModal({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) setFile(f);
    else toast.error("Please drop a CSV file");
  }, []);

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !file) return;
    setLoading(true);

    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (result.errors.length > 0) {
        toast.error("CSV parsing error: " + result.errors[0].message);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: portfolio, error: pErr } = await supabase
        .from("portfolios")
        .insert({ name: name.trim(), description: description.trim() || null, user_id: user.id })
        .select()
        .single();

      if (pErr) throw pErr;

      const parsedRows = result.data as Array<Record<string, string>>;
      const uniqueTickers = Array.from(
        new Set(
          parsedRows
            .map((row) => (row.Ticker || "").toUpperCase().trim())
            .filter(Boolean),
        ),
      );

      const metadataEntries = await Promise.all(
        uniqueTickers.map(async (ticker) => {
          try {
            const res = await fetch(
              `${API_BASE_URL}/api/market/search?q=${encodeURIComponent(ticker)}`,
            );
            if (!res.ok) return [ticker, null] as const;
            const matches = (await res.json()) as AssetSearchResult[];
            const exactMatch =
              matches.find((item) => item.ticker.toUpperCase() === ticker) ??
              null;
            return [ticker, exactMatch] as const;
          } catch {
            return [ticker, null] as const;
          }
        }),
      );

      const metadataByTicker = new Map(metadataEntries);

      const holdings = parsedRows.map((row) => {
        const ticker = (row.Ticker || "").toUpperCase().trim();
        const resolved = metadataByTicker.get(ticker);
        const stock = MOCK_STOCKS.find((s) => s.ticker === ticker);

        return {
          portfolio_id: portfolio.id,
          ticker,
          name: resolved?.name || stock?.name || row.Ticker || "Unknown",
          asset_type: resolved?.assetType || null,
          isin: stock?.isin || null,
          purchase_date: row.Date,
          purchase_price: parseFloat(row.Price) || 0,
          quantity: parseFloat(row.Quantity) || 0,
          fees: parseFloat(row.Fees) || 0,
        };
      });

      const { error: hErr } = await supabase.from("holdings").insert(holdings);
      if (hErr) throw hErr;

      toast.success("Portfolio created successfully");
      setName("");
      setDescription("");
      setFile(null);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Failed to create portfolio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
          <DialogDescription>Upload a CSV with your holdings data.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Portfolio name *</Label>
            <Input placeholder="My Portfolio" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>CSV file *</Label>
              <button onClick={handleDownloadTemplate} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Download className="h-3 w-3" /> Download template
              </button>
            </div>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
              }`}
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drop a CSV or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Format: Ticker, Date, Price, Quantity, Fees</p>
                </>
              )}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <Button onClick={handleSubmit} disabled={!name.trim() || !file || loading} className="w-full">
            {loading ? "Creating..." : "Create portfolio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
