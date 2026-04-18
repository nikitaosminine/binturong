import { useEffect } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { Thesis, ThesisConviction, ThesisStatus } from "@/lib/thesis";
import { ThesisBody } from "./thesis-body";
import { Button } from "@/components/ui/button";

interface ThesisDrawerProps {
  thesis: Thesis | null;
  onClose: () => void;
  onEdit: (thesis: Thesis) => void;
  onDelete: (id: string) => void;
}

const CONVICTION_COLORS: Record<ThesisConviction, string> = {
  low: "oklch(0.60 0.02 264)",
  med: "oklch(0.78 0.14 75)",
  high: "oklch(0.80 0.15 250)",
};

const STATUS_CLASSES: Record<ThesisStatus, string> = {
  active: "bg-primary/15 text-primary",
  "playing-out": "bg-positive/15 text-positive",
  invalidated: "bg-negative/15 text-negative",
  closed: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<ThesisStatus, string> = {
  active: "Active",
  "playing-out": "Playing out",
  invalidated: "Invalidated",
  closed: "Closed",
};

const EVIDENCE_COLORS = {
  confirm: "oklch(0.72 0.19 150)",
  warn: "oklch(0.72 0.19 30)",
  neutral: "oklch(0.60 0.02 264)",
};

function ConvictionDots({ level }: { level: ThesisConviction }) {
  const filled = level === "low" ? 1 : level === "med" ? 2 : 3;
  const color = CONVICTION_COLORS[level];
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full"
          style={{ background: i < filled ? color : "oklch(0.30 0.02 264)" }}
        />
      ))}
    </span>
  );
}

export function ThesisDrawer({ thesis, onClose, onEdit, onDelete }: ThesisDrawerProps) {
  useEffect(() => {
    if (!thesis) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [thesis, onClose]);

  if (!thesis) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[640px] bg-card border-l border-border/50 flex flex-col shadow-2xl"
        style={{ animation: "slidein .2s ease-out" }}
      >
        <div className="flex items-start justify-between p-5 border-b border-border/50 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[thesis.status]}`}>
                {STATUS_LABELS[thesis.status]}
              </span>
              <ConvictionDots level={thesis.conviction} />
              <span className="text-xs text-muted-foreground capitalize">{thesis.conviction} conviction</span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight">{thesis.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{thesis.summary}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(thesis)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-negative"
              onClick={() => { onDelete(thesis.id); onClose(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-6">
            <div className="flex gap-4 text-xs text-muted-foreground">
              {thesis.horizon && (
                <span>Horizon: <span className="text-foreground font-medium">{thesis.horizon}</span></span>
              )}
              <span>Added: <span className="text-foreground font-medium">{thesis.createdAt}</span></span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Linked positions</p>
              <div className="flex flex-wrap gap-1.5">
                {thesis.tickers.map((tk) => (
                  <span key={tk} className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-mono font-medium">
                    {tk}
                  </span>
                ))}
              </div>
            </div>

            {thesis.body.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Reasoning</p>
                <ThesisBody blocks={thesis.body} />
              </div>
            )}

            {thesis.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {thesis.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {thesis.evidence.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Agent evidence log</p>
                <div className="border-l border-border ml-2 space-y-3 pl-4">
                  {thesis.evidence.map((ev) => (
                    <div key={ev.id} className="relative">
                      <span
                        className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card"
                        style={{ background: EVIDENCE_COLORS[ev.type] }}
                      />
                      <p className="text-sm leading-snug">{ev.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
