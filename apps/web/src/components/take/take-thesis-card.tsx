import { AlertTriangle, Paperclip, TrendingDown, TrendingUp } from "lucide-react";
import { Thesis, ThesisConviction, ThesisStatus } from "@/lib/thesis";
import { ThesisSignals } from "@/components/take/take-feed";

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
  signals: ThesisSignals;
  selected: boolean;
  highlighted: boolean;
  onOpen: () => void;
}

export function TakeThesisCard({
  thesis,
  signals,
  selected,
  highlighted,
  onOpen,
}: TakeThesisCardProps) {
  return (
    <button
      onClick={onOpen}
      className={`text-left rounded-lg border p-4 transition-colors space-y-3 cursor-pointer ${
        selected
          ? "border-primary/50 bg-primary/5"
          : highlighted
            ? "border-primary/30 bg-card"
            : "border-border/50 bg-card hover:border-border"
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

      {signals.total > 0 && (
        <div className="flex items-center gap-2 text-[10px]">
          {signals.supportive > 0 && (
            <span className="flex items-center gap-0.5 text-positive">
              <TrendingUp className="h-2.5 w-2.5" />
              {signals.supportive}
            </span>
          )}
          {signals.atRisk > 0 && (
            <span className="flex items-center gap-0.5 text-negative">
              <TrendingDown className="h-2.5 w-2.5" />
              {signals.atRisk}
            </span>
          )}
          {signals.watch > 0 && (
            <span className="flex items-center gap-0.5 text-warning">
              <AlertTriangle className="h-2.5 w-2.5" />
              {signals.watch}
            </span>
          )}
          <span className="text-muted-foreground">· {signals.total} signals</span>
          {signals.newCount > 0 && (
            <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
              {signals.newCount} new
            </span>
          )}
        </div>
      )}

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

        {(thesis.attachments ?? []).length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            {thesis.attachments.length}
          </span>
        )}
      </div>
    </button>
  );
}
