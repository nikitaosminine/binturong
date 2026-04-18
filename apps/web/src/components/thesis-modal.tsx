import { useState, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { Thesis, ThesisConviction, ThesisStatus, STOCKS } from "@/lib/thesis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ThesisModalProps {
  open: boolean;
  initial?: Thesis | null;
  onSave: (data: Omit<Thesis, "id" | "createdAt">) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: ThesisStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "playing-out", label: "Playing out" },
  { value: "invalidated", label: "Invalidated" },
  { value: "closed", label: "Closed" },
];

const CONVICTION_OPTIONS: { value: ThesisConviction; label: string }[] = [
  { value: "low", label: "L" },
  { value: "med", label: "M" },
  { value: "high", label: "H" },
];

export function ThesisModal({ open, initial, onSave, onClose }: ThesisModalProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [conviction, setConviction] = useState<ThesisConviction>("med");
  const [status, setStatus] = useState<ThesisStatus>("active");
  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerSearch, setTickerSearch] = useState("");
  const [horizon, setHorizon] = useState("");
  const [tags, setTags] = useState("");
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        setTitle(initial.title);
        setSummary(initial.summary);
        setReasoning(initial.body.filter((b) => b.type === "p").map((b) => b.content as string).join("\n\n"));
        setConviction(initial.conviction);
        setStatus(initial.status);
        setTickers(initial.tickers);
        setHorizon(initial.horizon);
        setTags(initial.tags.join(", "));
      } else {
        setTitle(""); setSummary(""); setReasoning(""); setConviction("med");
        setStatus("active"); setTickers([]); setHorizon(""); setTags("");
      }
      setTickerSearch("");
    }
  }, [open, initial]);

  useEffect(() => {
    if (!showTickerDropdown) return;
    const handler = (e: MouseEvent) => {
      if (tickerRef.current && !tickerRef.current.contains(e.target as Node)) {
        setShowTickerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTickerDropdown]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const filteredStocks = STOCKS.filter(
    (s) =>
      (s.ticker.toLowerCase().includes(tickerSearch.toLowerCase()) ||
        s.name.toLowerCase().includes(tickerSearch.toLowerCase())) &&
      !tickers.includes(s.ticker)
  ).slice(0, 8);

  const handleSave = () => {
    if (!title.trim()) return;
    const body = reasoning.trim()
      ? [{ type: "p" as const, content: reasoning.trim() }]
      : [];
    onSave({
      title: title.trim(),
      summary: summary.trim(),
      conviction,
      status,
      tickers,
      body,
      evidence: initial?.evidence ?? [],
      horizon: horizon.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl bg-card border border-border/50 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <h2 className="text-base font-semibold">{initial ? "Edit take" : "New take"}</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input
                placeholder="e.g. AI infrastructure supercycle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Summary <span className="text-muted-foreground/50">(one line)</span></Label>
              <Input
                placeholder="The core thesis in one sentence"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Reasoning</Label>
              <textarea
                placeholder="Expand on your thesis. What's the key insight? What could invalidate it?"
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                className="w-full min-h-[120px] resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div ref={tickerRef} className="space-y-1.5 relative">
              <Label className="text-xs text-muted-foreground">Tickers</Label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-input min-h-9 bg-transparent">
                {tickers.map((tk) => (
                  <span
                    key={tk}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs font-mono"
                  >
                    {tk}
                    <button
                      onClick={() => setTickers((prev) => prev.filter((t) => t !== tk))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  placeholder={tickers.length === 0 ? "Search ticker or company…" : ""}
                  value={tickerSearch}
                  onChange={(e) => { setTickerSearch(e.target.value); setShowTickerDropdown(true); }}
                  onFocus={() => setShowTickerDropdown(true)}
                  className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {showTickerDropdown && tickerSearch && filteredStocks.length > 0 && (
                <div className="absolute z-10 w-full top-full mt-1 rounded-lg border border-border/50 bg-card shadow-lg p-1 space-y-0.5">
                  {filteredStocks.map((s) => (
                    <button
                      key={s.ticker}
                      onClick={() => {
                        setTickers((prev) => [...prev, s.ticker]);
                        setTickerSearch("");
                        setShowTickerDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-muted/50 flex items-center justify-between"
                    >
                      <span className="font-mono font-medium">{s.ticker}</span>
                      <span className="text-muted-foreground">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Conviction</Label>
                <div className="flex gap-1">
                  {CONVICTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setConviction(opt.value)}
                      className={`flex-1 h-9 rounded text-sm font-medium transition-colors border ${
                        conviction === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ThesisStatus)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Horizon</Label>
                <Input
                  placeholder="e.g. 12 months"
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags <span className="text-muted-foreground/50">(comma separated)</span></Label>
                <Input
                  placeholder="e.g. AI, semiconductors"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-border/50">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {initial ? "Save changes" : "Add take"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
