import { Thesis } from "@/lib/thesis";

export type InsightStatus = "At risk" | "Supportive" | "Neutral" | "Watch";
export type DateBucket = "Today" | "Yesterday" | "This week" | "Earlier";

export interface TakeInsight {
  id: string;
  thesisId: string;
  ticker: string;
  status: InsightStatus;
  headline: string;
  body: string;
  hoursAgo: number;
  unread?: boolean;
}

export interface ThesisSignals {
  supportive: number;
  atRisk: number;
  watch: number;
  total: number;
  newCount: number;
}

export function bucketFor(hoursAgo: number): DateBucket {
  if (hoursAgo < 24) return "Today";
  if (hoursAgo < 48) return "Yesterday";
  if (hoursAgo < 24 * 7) return "This week";
  return "Earlier";
}

export const BUCKET_ORDER: DateBucket[] = ["Today", "Yesterday", "This week", "Earlier"];

export function formatTime(hoursAgo: number): string {
  if (hoursAgo < 1) return `${Math.max(1, Math.round(hoursAgo * 60))}m ago`;
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}h ago`;
  return `${Math.round(hoursAgo / 24)}d ago`;
}

function toHoursAgo(date: string): number {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return 999;
  const diffMs = Date.now() - value.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

export function insightFromTheses(theses: Thesis[]): TakeInsight[] {
  return theses
    .flatMap((thesis) =>
      thesis.evidence.map((evidence) => ({
        id: evidence.id,
        thesisId: thesis.id,
        ticker: thesis.tickers[0] ?? "N/A",
        status:
          evidence.type === "warn"
            ? "At risk"
            : evidence.type === "confirm"
              ? "Supportive"
              : "Neutral",
        headline: evidence.text,
        body: `${thesis.title} · ${thesis.summary}`,
        hoursAgo: toHoursAgo(evidence.date),
        unread: toHoursAgo(evidence.date) < 24,
      })),
    )
    .sort((a, b) => a.hoursAgo - b.hoursAgo);
}

export function signalsFor(thesisId: string, insights: TakeInsight[]): ThesisSignals {
  const linked = insights.filter((i) => i.thesisId === thesisId);
  return {
    supportive: linked.filter((i) => i.status === "Supportive").length,
    atRisk: linked.filter((i) => i.status === "At risk").length,
    watch: linked.filter((i) => i.status === "Watch").length,
    total: linked.length,
    newCount: linked.filter((i) => i.unread).length,
  };
}

export function rankScore(insight: TakeInsight, thesis?: Thesis): number {
  const severity: Record<InsightStatus, number> = {
    "At risk": 4,
    Watch: 3,
    Supportive: 2,
    Neutral: 1,
  };

  const active: Record<Thesis["status"], number> = {
    active: 3,
    "playing-out": 2,
    invalidated: 1,
    closed: 0,
  };

  const sev = severity[insight.status];
  const act = thesis ? active[thesis.status] : 1;
  const recency = Math.max(0, 100 - insight.hoursAgo);

  return sev * 100 + act * 20 + recency * 0.1;
}
