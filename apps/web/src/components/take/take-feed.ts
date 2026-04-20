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

function mockInsightsForTheses(theses: Thesis[]): TakeInsight[] {
  if (theses.length === 0) return [];

  const primary = theses.find((thesis) => thesis.status === "active") ?? theses[0];
  const secondary =
    theses.find((thesis) => thesis.id !== primary.id && thesis.status !== "closed") ??
    theses.find((thesis) => thesis.id !== primary.id) ??
    primary;

  const templates: Array<Omit<TakeInsight, "thesisId" | "ticker"> & { useSecondary?: boolean }> = [
    {
      id: "mock-i1",
      status: "At risk",
      headline: "China smartphone shipments down 4.2% YoY",
      body: "Counterpoint data shows continued share loss in premium tier. Short-term headwind for this thesis leg.",
      hoursAgo: 2,
      unread: true,
    },
    {
      id: "mock-i2",
      status: "Watch",
      headline: "SaaS multiples compressed to 5.8x NTM revenue",
      body: "Sector de-rating is accelerating. Monitor for capitulation signals before the next leg lower.",
      hoursAgo: 4,
      useSecondary: true,
    },
    {
      id: "mock-i3",
      status: "Supportive",
      headline: "Google reports TPU demand outpacing supply",
      body: "Capex guidance raised with custom silicon driving margin expansion. Aligns with cost-advantage thesis.",
      hoursAgo: 1,
      unread: true,
    },
    {
      id: "mock-i4",
      status: "Supportive",
      headline: "Anthropic launches enterprise sales agent",
      body: "New autonomous agent targets CRM workflows directly — reinforces disruption pressure on incumbents.",
      hoursAgo: 0.2,
      unread: true,
      useSecondary: true,
    },
    {
      id: "mock-i5",
      status: "At risk",
      headline: "EU construction output fell 3% this month",
      body: "Works against the cyclical recovery angle. Reassess timing assumptions on this setup.",
      hoursAgo: 26,
    },
    {
      id: "mock-i6",
      status: "Neutral",
      headline: "DOJ remedies hearing pushed to Q2",
      body: "No material update yet, but timeline shift lowers immediate event risk.",
      hoursAgo: 30,
    },
    {
      id: "mock-i7",
      status: "At risk",
      headline: "Salesforce guides Q4 below consensus",
      body: "Management cited elongated cycles and higher competition intensity; monitor position risk and timing.",
      hoursAgo: 80,
      useSecondary: true,
    },
  ];

  return templates.map((template) => {
    const target = template.useSecondary ? secondary : primary;
    return {
      id: template.id,
      thesisId: target.id,
      ticker: target.tickers[0] ?? "N/A",
      status: template.status,
      headline: template.headline,
      body: template.body,
      hoursAgo: template.hoursAgo,
      unread: template.unread,
    };
  });
}

export function insightFromTheses(theses: Thesis[]): TakeInsight[] {
  const evidenceInsights = theses
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

  if (evidenceInsights.length >= 5) {
    return evidenceInsights;
  }

  return [...mockInsightsForTheses(theses), ...evidenceInsights]
    .filter((insight, index, self) => self.findIndex((item) => item.id === insight.id) === index)
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
