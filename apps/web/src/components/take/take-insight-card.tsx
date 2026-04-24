import { AlertTriangle, Eye, TrendingDown, TrendingUp, X } from "lucide-react";
import { Thesis } from "@/lib/thesis";
import { TakeInsight, formatTime } from "@/components/take/take-feed";

const INSIGHT_STYLES = {
  "At risk": {
    badge: "bg-negative/15 text-negative border-negative/40",
    bar: "bg-negative",
    icon: <TrendingDown className="h-3 w-3" />,
  },
  Supportive: {
    badge: "bg-positive/15 text-positive border-positive/40",
    bar: "bg-positive",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  Neutral: {
    badge: "bg-muted text-muted-foreground border-border",
    bar: "bg-muted-foreground/50",
    icon: <Eye className="h-3 w-3" />,
  },
  Watch: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    bar: "bg-amber-400",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
} as const;

interface TakeInsightCardProps {
  insight: TakeInsight;
  thesis?: Thesis;
  selected: boolean;
  onSelect: () => void;
  onDismiss: () => void;
  onThesisClick: () => void;
}

export function TakeInsightCard({
  insight,
  thesis,
  selected,
  onSelect,
  onDismiss,
  onThesisClick,
}: TakeInsightCardProps) {
  const style = INSIGHT_STYLES[insight.status];

  return (
    <article
      onClick={onSelect}
      className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-all ${
        selected ? "border-primary/50 bg-primary/5" : "border-border/50 bg-card hover:border-border"
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} />
      <div className="p-3 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {insight.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="New" />}
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
              {insight.ticker}
            </span>
            <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {insight.source === "agent" ? "Agent" : "Market"}
            </span>
            <span
              className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${style.badge}`}
            >
              {style.icon}
              {insight.status}
            </span>
            {insight.source === "agent" && insight.confidence != null && (
              <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {Math.round(insight.confidence)}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {formatTime(insight.hoursAgo)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Dismiss insight"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>

        <h3 className="mt-2 text-sm font-semibold">{insight.headline}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.body}</p>
        {insight.deltaSummary && (
          <p className="mt-1 text-[11px] text-primary/90">What changed: {insight.deltaSummary}</p>
        )}
        {insight.questionsForUser && insight.questionsForUser.length > 0 && (
          <div className="mt-2 rounded-md border border-border/60 bg-muted/30 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Questions for you</p>
            <ul className="mt-1 list-disc pl-4 text-[11px] text-foreground/90">
              {insight.questionsForUser.slice(0, 2).map((question, index) => (
                <li key={`${question}-${index}`}>{question}</li>
              ))}
            </ul>
          </div>
        )}
        {insight.evidenceIds && insight.evidenceIds.length > 0 && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Evidence links: {insight.evidenceIds.length}
          </p>
        )}

        {thesis && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Linked thesis:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onThesisClick();
              }}
              className="rounded px-1 text-foreground underline-offset-2 hover:bg-muted hover:underline"
            >
              {thesis.title}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
