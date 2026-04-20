import { Paperclip } from "lucide-react";
import { Thesis, ThesisConviction, ThesisStatus } from "@/lib/thesis";

const STATUS_LABELS: Record<ThesisStatus, string> = {
  active: "Active",
  "playing-out": "Playing out",
  invalidated: "Invalidated",
  closed: "Closed",
};

const STATUS_CLASSES: Record<ThesisStatus, string> = {
  active: "bg-primary/15 text-primary",
  "playing-out": "bg-positive/15 text-positive",
  invalidated: "bg-negative/15 text-negative",
  closed: "bg-muted text-muted-foreground",
};

const CONVICTION_COLORS: Record<ThesisConviction, string> = {
  low: "oklch(0.60 0.02 264)",
  med: "oklch(0.78 0.14 75)",
  high: "oklch(0.80 0.15 250)",
};

function ConvictionDots({ level }: { level: ThesisConviction }) {
  const filled = level === "low" ? 1 : level === "med" ? 2 : 3;
  const color = CONVICTION_COLORS[level];

  return (
    <span className="inline-flex gap-0.5 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i < filled ? color : "oklch(0.30 0.02 264)" }}
        />
      ))}
    </span>
  );
}

interface TakeThesisCardProps {
  thesis: Thesis;
  onOpen: () => void;
  viewMode: "grid" | "list";
}

export function TakeThesisCard({ thesis, onOpen, viewMode }: TakeThesisCardProps) {
  return (
    <button
      onClick={onOpen}
      className={`text-left rounded-lg border border-border/50 bg-card p-4 hover:border-border transition-colors space-y-3 cursor-pointer ${
        viewMode === "list" ? "w-full" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[thesis.status]}`}
          >
            {STATUS_LABELS[thesis.status]}
          </span>
          <ConvictionDots level={thesis.conviction} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{thesis.horizon}</span>
      </div>

      <div>
        <p className="text-sm font-semibold leading-snug">{thesis.title}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{thesis.summary}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {thesis.tickers.map((ticker) => (
            <span
              key={ticker}
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-xs font-mono"
            >
              {ticker}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {(thesis.attachments ?? []).length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {thesis.attachments.length}
            </span>
          )}
          {thesis.evidence.length > 0 && (
            <span className="text-xs text-muted-foreground">{thesis.evidence.length} signals</span>
          )}
        </div>
      </div>
    </button>
  );
}
