export type ThesisConviction = "low" | "med" | "high";
export type ThesisStatus = "active" | "playing-out" | "invalidated" | "closed";

export interface ThesisBodyBlock {
  type: "p" | "h" | "ul";
  content: string | string[];
}

export interface ThesisEvidence {
  id: string;
  type: "confirm" | "warn" | "neutral";
  text: string;
  date: string;
}

export interface Thesis {
  id: string;
  title: string;
  summary: string;
  conviction: ThesisConviction;
  status: ThesisStatus;
  tickers: string[];
  body: ThesisBodyBlock[];
  evidence: ThesisEvidence[];
  horizon: string;
  tags: string[];
  createdAt: string;
}

export const STOCKS = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft Corporation" },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "AMZN", name: "Amazon.com Inc." },
  { ticker: "NVDA", name: "NVIDIA Corporation" },
  { ticker: "TSLA", name: "Tesla Inc." },
  { ticker: "META", name: "Meta Platforms Inc." },
  { ticker: "NFLX", name: "Netflix Inc." },
  { ticker: "AMD", name: "Advanced Micro Devices" },
  { ticker: "INTC", name: "Intel Corporation" },
  { ticker: "QCOM", name: "Qualcomm Inc." },
  { ticker: "CRM", name: "Salesforce Inc." },
  { ticker: "ADBE", name: "Adobe Inc." },
  { ticker: "ORCL", name: "Oracle Corporation" },
];

export const DEMO_THESES: Thesis[] = [
  {
    id: "t1",
    title: "AI infrastructure supercycle",
    summary: "Hyperscaler capex on GPU clusters and data center buildout will sustain NVDA earnings beats through 2026.",
    conviction: "high",
    status: "active",
    tickers: ["NVDA", "AMD"],
    horizon: "18 months",
    tags: ["AI", "semiconductors"],
    body: [
      { type: "h", content: "Core thesis" },
      { type: "p", content: "AI training and inference workloads are doubling YoY. NVDA's H100/H200 allocation is sold out through mid-2025, creating a durable backlog that translates directly to revenue visibility." },
      { type: "h", content: "Key risks" },
      { type: "ul", content: ["Custom silicon from hyperscalers (TPU, Trainium) cannibalizes share over time", "Export controls tighten further into China", "Memory bandwidth becomes the new bottleneck before GPUs"] },
    ],
    evidence: [
      { id: "e1a", type: "confirm", text: "Microsoft announced $80B capex for FY2025 — 60% allocated to AI infrastructure", date: "2025-01-29" },
      { id: "e1b", type: "confirm", text: "NVDA Q4 FY2025: Data Center revenue $35.6B, +93% YoY, beat by $2.1B", date: "2025-02-26" },
      { id: "e1c", type: "warn", text: "Google TPU v6 benchmarks show 2x perf/$ vs H100 for transformer workloads", date: "2025-03-12" },
    ],
    createdAt: "2024-11-15",
  },
  {
    id: "t2",
    title: "Apple services margin expansion",
    summary: "Services segment will reach 40% of total revenue by FY2026, re-rating the multiple upward.",
    conviction: "med",
    status: "playing-out",
    tickers: ["AAPL"],
    horizon: "24 months",
    tags: ["services", "margins"],
    body: [
      { type: "p", content: "Apple's installed base of 2.2B active devices provides an annuity stream of high-margin subscription revenue through App Store, iCloud, and Apple TV+." },
      { type: "ul", content: ["App Store take rate holding near 27-30% despite DMA pressure in EU", "iCloud family plan growth in emerging markets", "Financial services (BNPL, savings) reaching meaningful scale"] },
    ],
    evidence: [
      { id: "e2a", type: "confirm", text: "Services revenue grew 14% YoY to $26.3B in Q1 FY2025", date: "2025-02-06" },
      { id: "e2b", type: "neutral", text: "EU DMA compliance cost estimated at $1.2B annually — manageable at scale", date: "2025-01-15" },
    ],
    createdAt: "2024-10-03",
  },
  {
    id: "t3",
    title: "Microsoft Azure AI monetization",
    summary: "Copilot seat adoption across M365 will add $10–15B of incremental ARR by end of 2025.",
    conviction: "high",
    status: "active",
    tickers: ["MSFT"],
    horizon: "12 months",
    tags: ["AI", "SaaS", "enterprise"],
    body: [
      { type: "p", content: "Microsoft has an unmatched distribution advantage: 345M paid M365 seats that can be upsold to Copilot at $30/seat/month. Even 10% penetration equals $12.4B ARR — highly likely given enterprise mandate dynamics." },
    ],
    evidence: [
      { id: "e3a", type: "confirm", text: "Copilot commercial seats doubled QoQ in Q2 FY2025", date: "2025-01-29" },
      { id: "e3b", type: "warn", text: "Enterprise churn on Copilot seats reportedly elevated — low engagement in early cohorts", date: "2025-03-05" },
    ],
    createdAt: "2024-09-20",
  },
  {
    id: "t4",
    title: "Meta advertising recovery",
    summary: "Reels monetization closing the gap with Feed + Stories. Advantage+ AI tools driving ROAS improvements for SMBs.",
    conviction: "med",
    status: "playing-out",
    tickers: ["META"],
    horizon: "12 months",
    tags: ["advertising", "AI"],
    body: [
      { type: "p", content: "Meta's ad revenue recovery post-ATT is now structural. The Advantage+ creative and targeting tools have increased SMB ROAS by an average of 22%, creating stickiness that competitors can't easily replicate." },
    ],
    evidence: [
      { id: "e4a", type: "confirm", text: "Q4 2024 ad revenue: $46.8B, +21% YoY — ad impressions +11%, price +6%", date: "2025-01-29" },
    ],
    createdAt: "2024-08-10",
  },
  {
    id: "t5",
    title: "Intel turnaround skepticism",
    summary: "18A node delays and market share losses to AMD make recovery timeline too uncertain to hold.",
    conviction: "high",
    status: "invalidated",
    tickers: ["INTC"],
    horizon: "6 months",
    tags: ["semiconductors"],
    body: [
      { type: "p", content: "Intel's foundry ambitions require sustained capex while core business erodes. The 18A process node has faced repeated delays and customer qualification issues that undermine the entire strategic rationale." },
    ],
    evidence: [
      { id: "e5a", type: "warn", text: "Intel guides Q1 2025 revenue $11.7–12.7B, well below street at $14.6B", date: "2025-01-31" },
      { id: "e5b", type: "warn", text: "Broadcom and Qualcomm reportedly declining 18A test chips — going to TSMC", date: "2025-02-20" },
      { id: "e5c", type: "neutral", text: "CEO Lip-Bu Tan accelerates restructuring: 15,000 additional layoffs planned", date: "2025-03-18" },
    ],
    createdAt: "2024-07-01",
  },
  {
    id: "t6",
    title: "Netflix password-sharing tailwind exhaustion",
    summary: "The one-time boost from paid sharing conversion is now fully in the base. Growth will revert to mid-single-digits.",
    conviction: "low",
    status: "closed",
    tickers: ["NFLX"],
    horizon: "6 months",
    tags: ["streaming", "growth"],
    body: [
      { type: "p", content: "Netflix's subscriber adds from the paid-sharing crackdown were extraordinary in 2023-2024 but are now largely exhausted globally. The ad tier provides a new monetization vector but at meaningfully lower ARPU than the standard tier." },
    ],
    evidence: [
      { id: "e6a", type: "neutral", text: "Q4 2024: +19M subscribers (record quarter), but management signals normalization ahead", date: "2025-01-21" },
    ],
    createdAt: "2024-06-15",
  },
];

export function thesesForTicker(theses: Thesis[], ticker: string): Thesis[] {
  return theses.filter((t) => t.tickers.includes(ticker));
}

export function thesesForPortfolio(theses: Thesis[], tickers: string[]): Thesis[] {
  return theses.filter((t) => t.tickers.some((tk) => tickers.includes(tk)));
}
