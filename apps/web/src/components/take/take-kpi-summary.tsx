import { AlertTriangle, Eye, Sparkles } from "lucide-react";
import { Thesis } from "@/lib/thesis";
import { TakeInsight, signalsFor } from "@/components/take/take-feed";

interface TakeKpiSummaryProps {
  theses: Thesis[];
  insights: TakeInsight[];
  onJumpToAtRisk: () => void;
}

export function TakeKpiSummary({ theses, insights, onJumpToAtRisk }: TakeKpiSummaryProps) {
  const recent = insights.filter((insight) => insight.hoursAgo < 24);
  const atRiskNow = recent.filter((insight) => insight.status === "At risk");
  const supportiveNow = recent.filter((insight) => insight.status === "Supportive");
  const watchNow = recent.filter((insight) => insight.status === "Watch");

  const atRiskTheses = new Set(
    atRiskNow
      .map((insight) => insight.thesisId)
      .filter((id) =>
        theses.find(
          (thesis) => thesis.id === id && ["active", "playing-out"].includes(thesis.status),
        ),
      ),
  );

  const newSinceLastVisit = insights.filter((insight) => insight.unread).length;

  const atRiskByThesis = theses
    .filter((thesis) => thesis.status === "active" || thesis.status === "playing-out")
    .map((thesis) => ({ thesis, signals: signalsFor(thesis.id, insights) }))
    .filter((row) => row.signals.atRisk > 0)
    .slice(0, 2);

  return (
    <div className="mb-3 rounded-lg border border-border/50 bg-card px-3 py-2.5">
      {atRiskTheses.size > 0 ? (
        <button
          onClick={onJumpToAtRisk}
          className="flex w-full items-center gap-2 text-left text-xs hover:opacity-80"
        >
          <span className="text-negative">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="font-semibold text-negative">{atRiskTheses.size}</span>
            <span className="text-muted-foreground">
              {" "}
              {atRiskTheses.size === 1 ? "thesis has" : "theses have"} new at-risk signals today
            </span>
          </span>
          {newSinceLastVisit > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {newSinceLastVisit} new
            </span>
          )}
        </button>
      ) : supportiveNow.length > 0 ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-positive">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <span className="font-semibold text-positive">{supportiveNow.length}</span>
            <span className="text-muted-foreground">
              {" "}
              supportive {supportiveNow.length === 1 ? "signal" : "signals"} today
            </span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="h-4 w-4" />
          No new signals today — quiet market
        </div>
      )}

      {(atRiskByThesis.length > 0 || watchNow.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2 text-[10px]">
          {atRiskByThesis.map(({ thesis, signals }) => (
            <span
              key={thesis.id}
              className="flex items-center gap-1 rounded bg-negative/15 px-1.5 py-0.5 text-negative"
              title={thesis.title}
            >
              <span className="h-1 w-1 rounded-full bg-negative" />
              {thesis.tickers[0]} · {signals.atRisk} at-risk
            </span>
          ))}

          {watchNow.length > 0 && (
            <span className="flex items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-warning">
              <span className="h-1 w-1 rounded-full bg-warning" />
              {watchNow.length} to watch
            </span>
          )}
        </div>
      )}
    </div>
  );
}
