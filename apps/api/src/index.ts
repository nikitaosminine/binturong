import { createClient } from "@supabase/supabase-js";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_ANON_KEY: string;
  AGENT_RUNS_QUEUE: Queue<AgentRunQueueMessage>;
  GROK_MAIN_API_KEY?: string;
  GROK_SUB_API_KEY?: string;
  GROK_WEB_SEARCH_MODEL?: string;
  GROK_API_BASE_URL?: string;
  MAIN_AGENT_SYSTEM_PROMPT?: string;
  SUB_AGENT_SYSTEM_PROMPT?: string;
  SUB_AGENT_PLANNING_SYSTEM_PROMPT?: string;
  FRED_API_KEY?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function db(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

function parseSymbols(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) throw new Error(`Yahoo API error (${res.status})`);
  return (await res.json()) as T;
}

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  fullExchangeName?: string;
  quoteType?: string;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

interface YahooQuoteItem {
  currentPrice: number | null;
  change1dPercent: number | null;
  sector: string | null;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number | null;
        previousClose?: number | null;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: Array<{
      symbol?: string;
      regularMarketPrice?: number | null;
      regularMarketPreviousClose?: number | null;
      regularMarketChangePercent?: number | null;
    }>;
  };
}

interface YahooQuoteSummaryResponse {
  quoteSummary?: {
    result?: Array<{
      summaryProfile?: {
        sector?: string;
      };
      assetProfile?: {
        sector?: string;
      };
      fundProfile?: {
        categoryName?: string;
        fundFamily?: string;
      };
    }>;
  };
}

type AgentRunTriggerType = "scheduled" | "ondemand";
type AgentRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "failed_validation";

interface AgentRunQueueMessage {
  runId: string;
  userId: string;
  portfolioId: string;
  triggerType: AgentRunTriggerType;
}

type AgentToolName =
  | "portfolio_context"
  | "market_quotes"
  | "get_ecb_data"
  | "get_fred_indicator"
  | "search_news";

interface AgentToolCall {
  tool: AgentToolName;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
}

interface AgentRunRow {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  trigger_type: AgentRunTriggerType;
  status: AgentRunStatus;
  idempotency_key: string;
  scope_hash: string;
  model_main: string | null;
  model_sub: string | null;
  token_usage: Record<string, unknown>;
  error_code: string | null;
  error_detail: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PortfolioContextResult {
  portfolioId: string;
  holdings: Array<{
    ticker: string;
    name: string;
    quantity: number;
  }>;
  theses: Array<{
    id: string;
    title: string;
    summary: string;
    body: unknown;
    evidence: unknown;
    horizon: string;
    conviction: "low" | "med" | "high";
    tickers: string[];
    status: string;
  }>;
}

interface MarketQuotesResult {
  tickers: string[];
  quotes: Array<{
    ticker: string;
    currentPrice: number | null;
    change1dPercent: number | null;
    ytdChangePercent: number | null;
    sector: string;
  }>;
}

interface EcbDataResult {
  dataset: string;
  observations: Array<{
    period: string;
    value: string;
  }>;
}

interface FredIndicatorResult {
  series_id: string;
  observations: Array<{
    date: string;
    value: string;
  }>;
}

interface NewsSearchResult {
  query: string;
  items: Array<{
    title: string;
    url: string;
    source: string;
    snippet: string;
    published_at: string | null;
    is_stale: boolean;
  }>;
  provider: "xai_web_search" | "google_rss_fallback";
  recencyDays: number;
  totalRetrieved: number;
}

interface GuardrailState {
  startedMs: number;
  totalCalls: number;
  callsByTool: Record<AgentToolName, number>;
  maxTotalCalls: number;
  perToolLimit: number;
  maxDurationMs: number;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank] ?? null;
}

interface AgentRunMetricsSummary {
  window_hours: number;
  from_iso: string;
  total_runs: number;
  counts_by_status: Record<string, number>;
  counts_by_trigger: Record<string, number>;
  queue_depth: number;
  success_rate: number | null;
  duration_ms: {
    samples: number;
    avg: number | null;
    p50: number | null;
    p95: number | null;
  };
  failures_with_error_code: Record<string, number>;
}

function summarizeRunMetrics(
  rows: Array<{
    status: string | null;
    trigger_type: string | null;
    started_at: string | null;
    finished_at: string | null;
    error_code: string | null;
  }>,
  options: { hours: number; fromIso: string },
): AgentRunMetricsSummary {
  const countsByStatus = rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.status ?? "unknown");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const countsByTrigger = rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.trigger_type ?? "unknown");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const durationsMs = rows
    .map((row) => {
      if (!row.started_at || !row.finished_at) return null;
      const ms = new Date(row.finished_at).getTime() - new Date(row.started_at).getTime();
      return Number.isFinite(ms) && ms >= 0 ? ms : null;
    })
    .filter((ms): ms is number => ms != null);
  const completed = countsByStatus.completed ?? 0;
  const failed = countsByStatus.failed ?? 0;
  const successRate = completed + failed > 0 ? completed / (completed + failed) : null;

  return {
    window_hours: options.hours,
    from_iso: options.fromIso,
    total_runs: rows.length,
    counts_by_status: countsByStatus,
    counts_by_trigger: countsByTrigger,
    queue_depth: (countsByStatus.queued ?? 0) + (countsByStatus.running ?? 0),
    success_rate: successRate,
    duration_ms: {
      samples: durationsMs.length,
      avg:
        durationsMs.length > 0
          ? Math.round(durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length)
          : null,
      p50: percentile(durationsMs, 50),
      p95: percentile(durationsMs, 95),
    },
    failures_with_error_code: rows
      .filter((row) => row.status === "failed")
      .reduce<Record<string, number>>((acc, row) => {
        const key = String(row.error_code ?? "UNKNOWN");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
  };
}

function classifyQueueProcessingError(error: unknown): {
  retryable: boolean;
  errorCode: string;
  failureClass: string;
  detail: string;
  statusOverride?: "failed_validation" | "failed";
} {
  const detail = error instanceof Error ? error.message : "Unknown queue processing error";
  if (detail.includes("Model output is not valid JSON")) {
    return {
      retryable: false,
      errorCode: "MODEL_OUTPUT_INVALID_JSON",
      failureClass: "validation",
      detail,
      statusOverride: "failed_validation",
    };
  }
  if (detail.includes("Model output missing required items")) {
    return {
      retryable: false,
      errorCode: "MODEL_OUTPUT_EMPTY",
      failureClass: "validation",
      detail,
      statusOverride: "failed_validation",
    };
  }
  if (detail.includes("Grok API error (4")) {
    return {
      retryable: false,
      errorCode: "UPSTREAM_GROK_4XX",
      failureClass: "upstream_permanent",
      detail,
    };
  }
  if (detail.includes("Grok API error (5")) {
    return {
      retryable: true,
      errorCode: "UPSTREAM_GROK_5XX",
      failureClass: "upstream_transient",
      detail,
    };
  }
  if (detail.includes("Missing ") || detail.includes("Server misconfiguration")) {
    return {
      retryable: false,
      errorCode: "CONFIGURATION_ERROR",
      failureClass: "configuration",
      detail,
    };
  }
  if (detail.includes("Guardrail:")) {
    return {
      retryable: false,
      errorCode: "GUARDRAIL_LIMIT_HIT",
      failureClass: "guardrail",
      detail,
    };
  }
  if (detail.includes("Yahoo API error (429")) {
    return {
      retryable: true,
      errorCode: "UPSTREAM_YAHOO_429",
      failureClass: "upstream_transient",
      detail,
    };
  }
  return {
    retryable: true,
    errorCode: "QUEUE_PROCESSING_ERROR",
    failureClass: "unknown",
    detail,
  };
}

interface SubAgentOutput {
  evidence_items: Array<{
    id: string;
    thesis_id: string;
    claim: string;
    snippet: string;
    url: string;
    source: string;
    published_at: string | null;
    is_stale: boolean;
    staleness_reason: string | null;
    relevance_score: number;
    tags: string[];
  }>;
  missing_info: string[];
  retrieval_meta: {
    query: string;
    provider: "xai_web_search" | "google_rss_fallback";
    recency_days: number;
    total_retrieved: number;
    total_kept: number;
    total_stale: number;
  };
}

interface SubAgentPlanningOutput {
  classifications: Array<{
    thesis_id: string;
    established_facts: string[];
    claims_to_verify: string[];
    signals_to_monitor: string[];
    etf_underlying: string | null;
  }>;
  search_queries: Array<{
    thesis_id: string;
    query: string;
  }>;
  raw_search_queries?: Array<{
    thesis_id: string;
    query: string;
  }>;
}

interface MainAgentOutput {
  signals: Array<{
    thesis_id: string;
    signal_type: "at_risk" | "supportive" | "watch" | "neutral";
    title: string;
    explanation: string;
    risk_horizon: "short_term" | "long_term" | null;
    confidence: number;
    evidence_ids: string[];
    assumptions: string[];
    no_evidence_reason: string | null;
    change_type: "new_information" | "confirmation" | "contradiction" | "no_material_change";
    delta_summary: string | null;
  }>;
  overall_summary: string;
  questions_for_user: string[];
}

function normalizeSubAgentPlanningOutput(raw: Record<string, unknown>): SubAgentPlanningOutput {
  const classificationsRaw = Array.isArray(raw.classifications) ? raw.classifications : [];
  const searchQueriesRaw = Array.isArray(raw.search_queries) ? raw.search_queries : [];
  return {
    classifications: classificationsRaw
      .map((item) => {
        const row = item as Record<string, unknown>;
        const thesisId = String(row.thesis_id ?? "");
        if (!thesisId) return null;
        return {
          thesis_id: thesisId,
          established_facts: Array.isArray(row.established_facts)
            ? row.established_facts.map((value) => String(value))
            : [],
          claims_to_verify: Array.isArray(row.claims_to_verify)
            ? row.claims_to_verify.map((value) => String(value))
            : [],
          signals_to_monitor: Array.isArray(row.signals_to_monitor)
            ? row.signals_to_monitor.map((value) => String(value))
            : [],
          etf_underlying: row.etf_underlying == null ? null : String(row.etf_underlying),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
    search_queries: searchQueriesRaw
      .map((item) => {
        if (typeof item === "string") {
          return { thesis_id: "", query: item };
        }
        const row = item as Record<string, unknown>;
        return {
          thesis_id: String(row.thesis_id ?? ""),
          query: String(row.query ?? ""),
        };
      })
      .filter((item) => Boolean(item.query))
      .slice(0, 8),
  };
}

function toConceptQuery(input: { title: string; summary: string; tickers: string[] }): string {
  const base = `${input.title} ${input.summary}`
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = base
    .split(" ")
    .filter((word) => word.length > 2 && !/^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(word))
    .slice(0, 12);
  if (words.length > 0) return words.join(" ");
  return input.tickers.slice(0, 3).join(" ");
}

function normalizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function inferThesisIdForQuery(
  query: string,
  thesisPool: Array<{ id: string; descriptor: string }>,
): string {
  const queryTerms = new Set(normalizeWords(query));
  if (queryTerms.size === 0 || thesisPool.length === 0) return "";

  const ranked = thesisPool
    .map((thesis) => {
      const thesisTerms = new Set(normalizeWords(thesis.descriptor));
      let shared = 0;
      for (const term of queryTerms) {
        if (thesisTerms.has(term)) shared += 1;
      }
      return { id: thesis.id, score: shared };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0].id : "";
}

interface GrokChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function normalizeSectorLabel(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  if (!cleaned) return null;
  if (cleaned.toLowerCase() === "n/a") return null;
  return cleaned;
}

async function getSectorsForSymbols(symbols: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const url = new URL(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`);
        url.searchParams.set("modules", "summaryProfile,assetProfile,fundProfile");
        const summary = await fetchJson<YahooQuoteSummaryResponse>(url.toString());
        const profile = summary.quoteSummary?.result?.[0];
        const sector =
          normalizeSectorLabel(profile?.summaryProfile?.sector) ??
          normalizeSectorLabel(profile?.assetProfile?.sector) ??
          normalizeSectorLabel(profile?.fundProfile?.categoryName) ??
          normalizeSectorLabel(profile?.fundProfile?.fundFamily);
        if (!sector) return [symbol, "Other"] as const;
        return [symbol, sector] as const;
      } catch {
        return [symbol, "Other"] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

async function getQuotesFromBatch(symbols: string[]): Promise<Record<string, YahooQuoteItem>> {
  if (symbols.length === 0) return {};

  const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
  url.searchParams.set("symbols", symbols.join(","));

  const data = await fetchJson<YahooQuoteResponse>(url.toString());
  const rows = data.quoteResponse?.result ?? [];
  const bySymbol = rows.reduce<Record<string, YahooQuoteItem>>((acc, row) => {
    const symbol = row.symbol?.toUpperCase();
    if (!symbol) return acc;

    const currentPrice = row.regularMarketPrice ?? null;
    const change1dPercent =
      row.regularMarketChangePercent ??
      (currentPrice != null &&
      row.regularMarketPreviousClose != null &&
      row.regularMarketPreviousClose !== 0
        ? ((currentPrice - row.regularMarketPreviousClose) /
          row.regularMarketPreviousClose) *
          100
        : null);

    acc[symbol] = {
      currentPrice,
      change1dPercent,
      sector: null,
    };
    return acc;
  }, {});

  return bySymbol;
}

async function getQuoteFromChart(symbol: string): Promise<YahooQuoteItem> {
  try {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    url.searchParams.set("interval", "1d");
    url.searchParams.set("range", "5d");

    const chart = await fetchJson<YahooChartResponse>(url.toString());
    const series = chart.chart?.result?.[0];
    const closes = (series?.indicators?.quote?.[0]?.close ?? []).filter(
      (value): value is number => value != null,
    );
    const latestClose = closes.at(-1) ?? null;
    const previousClose = closes.length > 1 ? closes.at(-2)! : null;
    const change1dPercent =
      latestClose != null && previousClose != null && previousClose !== 0
        ? ((latestClose - previousClose) / previousClose) * 100
        : null;

    return {
      currentPrice: latestClose,
      change1dPercent,
      sector: null,
    };
  } catch {
    return {
      currentPrice: null,
      change1dPercent: null,
      sector: null,
    };
  }
}

async function getQuotesResilient(symbols: string[]): Promise<Record<string, YahooQuoteItem>> {
  try {
    const batch = await getQuotesFromBatch(symbols);
    const missing = symbols.filter((symbol) => !batch[symbol]);
    if (missing.length === 0) return batch;

    const fallbackEntries = await Promise.all(
      missing.map(async (symbol) => [symbol, await getQuoteFromChart(symbol)] as const),
    );
    return { ...batch, ...Object.fromEntries(fallbackEntries) };
  } catch {
    const fallbackEntries = await Promise.all(
      symbols.map(async (symbol) => [symbol, await getQuoteFromChart(symbol)] as const),
    );
    return Object.fromEntries(fallbackEntries);
  }
}

async function getYtdChangePercent(symbol: string): Promise<number | null> {
  try {
    const now = new Date();
    const ytdStartUnix = Math.floor(Date.UTC(now.getUTCFullYear(), 0, 1) / 1000);
    const nowUnix = Math.floor(now.getTime() / 1000);
    const chartUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    chartUrl.searchParams.set("period1", String(ytdStartUnix));
    chartUrl.searchParams.set("period2", String(nowUnix));
    chartUrl.searchParams.set("interval", "1d");
    chartUrl.searchParams.set("events", "history");

    const chart = await fetchJson<YahooChartResponse>(chartUrl.toString());
    const series = chart.chart?.result?.[0];
    const closes = series?.indicators?.quote?.[0]?.close ?? [];

    if (!closes.length) return null;
    const firstClose = closes.find((value) => value != null);
    const lastClose = [...closes].reverse().find((value) => value != null);
    if (!firstClose || !lastClose) return null;

    return ((lastClose - firstClose) / firstClose) * 100;
  } catch {
    return null;
  }
}

function buildIdempotencyKey(input: {
  userId: string;
  portfolioId: string;
  triggerType: AgentRunTriggerType;
  now: Date;
}): string {
  const dayWindow = `${input.now.getUTCFullYear()}-${String(input.now.getUTCMonth() + 1).padStart(2, "0")}-${String(input.now.getUTCDate()).padStart(2, "0")}`;
  if (input.triggerType === "scheduled") {
    const hourWindow = String(input.now.getUTCHours()).padStart(2, "0");
    return `${input.userId}:${input.portfolioId}:${input.triggerType}:${dayWindow}T${hourWindow}`;
  }

  const minuteWindow = `${dayWindow}T${String(input.now.getUTCHours()).padStart(2, "0")}:${String(input.now.getUTCMinutes()).padStart(2, "0")}`;
  return `${input.userId}:${input.portfolioId}:${input.triggerType}:${minuteWindow}`;
}

async function createRun(
  env: Env,
  params: {
    userId: string;
    portfolioId: string;
    triggerType: AgentRunTriggerType;
    idempotencyKey?: string;
  },
): Promise<AgentRunRow> {
  const now = new Date();
  const idempotencyKey =
    params.idempotencyKey ??
    buildIdempotencyKey({
      userId: params.userId,
      portfolioId: params.portfolioId,
      triggerType: params.triggerType,
      now,
    });

  const payload = {
    user_id: params.userId,
    portfolio_id: params.portfolioId,
    trigger_type: params.triggerType,
    status: "queued" as const,
    idempotency_key: idempotencyKey,
    scope_hash: params.portfolioId,
    model_main: "grok-4.20-0309-reasoning",
    model_sub: "grok-4-1-fast-reasoning",
  };

  const client = db(env);
  const { data: inserted, error: insertError } = await client
    .from("agent_runs")
    .insert(payload)
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing, error: existingError } = await client
        .from("agent_runs")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .single();
      if (existingError || !existing) {
        throw new Error(existingError?.message || "Failed to load existing run");
      }
      return existing as AgentRunRow;
    }

    throw new Error(insertError.message);
  }

  return inserted as AgentRunRow;
}

async function queueRun(env: Env, run: AgentRunRow): Promise<void> {
  await env.AGENT_RUNS_QUEUE.send({
    runId: run.id,
    userId: run.user_id,
    portfolioId: run.portfolio_id ?? "",
    triggerType: run.trigger_type,
  });
}

async function listUserPortfolioIds(env: Env, userId: string): Promise<string[]> {
  const { data, error } = await db(env)
    .from("portfolios")
    .select("id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id as string);
}

function runsPerDayToLocalHours(runsPerDay: number): number[] {
  if (runsPerDay <= 1) return [8];
  if (runsPerDay === 2) return [8, 20];
  return [6, 14, 22];
}

function getHourInTimezone(now: Date, timezone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const parsed = Number.parseInt(hour, 10);
  if (Number.isNaN(parsed)) return now.getUTCHours();
  return parsed;
}

async function runScheduledFanout(
  env: Env,
  options: { now: Date; dryRun?: boolean; source: "cron" | "manual" },
): Promise<{
  source: "cron" | "manual";
  dryRun: boolean;
  checkedPortfolios: number;
  duePortfolios: number;
  queuedRuns: number;
  queuedRunIds: string[];
}> {
  if (!env.AGENT_RUNS_QUEUE && !options.dryRun) {
    throw new Error("Server misconfiguration: AGENT_RUNS_QUEUE binding is missing");
  }

  const client = db(env);
  const [{ data: portfolios, error: portfoliosError }, { data: userSettings, error: userSettingsError }, { data: portfolioSettings, error: portfolioSettingsError }] =
    await Promise.all([
      client.from("portfolios").select("id,user_id"),
      client.from("agent_user_settings").select("user_id,timezone,global_runs_per_day"),
      client
        .from("agent_portfolio_settings")
        .select("portfolio_id,user_id,runs_per_day_override,agent_enabled"),
    ]);

  if (portfoliosError) throw new Error(`scheduled fanout portfolios error: ${portfoliosError.message}`);
  if (userSettingsError) {
    throw new Error(`scheduled fanout agent_user_settings error: ${userSettingsError.message}`);
  }
  if (portfolioSettingsError) {
    throw new Error(`scheduled fanout agent_portfolio_settings error: ${portfolioSettingsError.message}`);
  }

  const userSettingsByUserId = new Map(
    (userSettings ?? []).map((row) => [
      String(row.user_id),
      {
        timezone: String(row.timezone ?? "Europe/Paris"),
        globalRunsPerDay: Number(row.global_runs_per_day ?? 2),
      },
    ]),
  );
  const portfolioSettingsByPortfolioId = new Map(
    (portfolioSettings ?? []).map((row) => [
      String(row.portfolio_id),
      {
        userId: String(row.user_id),
        runsPerDayOverride:
          row.runs_per_day_override == null ? null : Number(row.runs_per_day_override),
        agentEnabled: row.agent_enabled == null ? true : Boolean(row.agent_enabled),
      },
    ]),
  );

  const dueTargets = (portfolios ?? []).filter((portfolio) => {
    const portfolioId = String(portfolio.id);
    const userId = String(portfolio.user_id);
    const userSetting = userSettingsByUserId.get(userId);
    const portfolioSetting = portfolioSettingsByPortfolioId.get(portfolioId);

    if (portfolioSetting && !portfolioSetting.agentEnabled) return false;

    const timezone = userSetting?.timezone ?? "Europe/Paris";
    const runsPerDay = Math.max(
      1,
      Math.min(3, portfolioSetting?.runsPerDayOverride ?? userSetting?.globalRunsPerDay ?? 2),
    );
    const localHour = getHourInTimezone(options.now, timezone);
    return runsPerDayToLocalHours(runsPerDay).includes(localHour);
  });

  if (options.dryRun) {
    return {
      source: options.source,
      dryRun: true,
      checkedPortfolios: (portfolios ?? []).length,
      duePortfolios: dueTargets.length,
      queuedRuns: 0,
      queuedRunIds: [],
    };
  }

  const queuedRunIds: string[] = [];
  for (const target of dueTargets) {
    const run = await createRun(env, {
      userId: String(target.user_id),
      portfolioId: String(target.id),
      triggerType: "scheduled",
    });
    await queueRun(env, run);
    queuedRunIds.push(run.id);
  }

  return {
    source: options.source,
    dryRun: false,
    checkedPortfolios: (portfolios ?? []).length,
    duePortfolios: dueTargets.length,
    queuedRuns: queuedRunIds.length,
    queuedRunIds,
  };
}

async function runPortfolioContextTool(
  env: Env,
  input: { userId: string; portfolioId: string },
): Promise<PortfolioContextResult> {
  const client = db(env);
  const [{ data: holdings, error: holdingsError }, { data: theses, error: thesesError }] =
    await Promise.all([
      client
        .from("holdings")
        .select("ticker,name,quantity")
        .eq("portfolio_id", input.portfolioId)
        .order("ticker", { ascending: true }),
      client
        .from("theses")
        .select("id,title,summary,body,evidence,horizon,conviction,tickers,status")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (holdingsError) throw new Error(`portfolio_context holdings error: ${holdingsError.message}`);
  if (thesesError) throw new Error(`portfolio_context theses error: ${thesesError.message}`);

  const portfolioTickers = new Set((holdings ?? []).map((row) => String(row.ticker).toUpperCase()));
  const filteredTheses = (theses ?? []).filter((row) =>
    (row.tickers ?? []).some((ticker: string) => portfolioTickers.has(String(ticker).toUpperCase())),
  );

  return {
    portfolioId: input.portfolioId,
    holdings: (holdings ?? []).map((row) => ({
      ticker: String(row.ticker).toUpperCase(),
      name: String(row.name ?? row.ticker),
      quantity: Number(row.quantity ?? 0),
    })),
    theses: filteredTheses.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      summary: String(row.summary ?? ""),
      body: row.body ?? [],
      evidence: row.evidence ?? [],
      horizon: String(row.horizon ?? ""),
      conviction:
        row.conviction === "low" || row.conviction === "high" ? row.conviction : "med",
      tickers: (row.tickers ?? []).map((ticker: string) => String(ticker).toUpperCase()),
      status: String(row.status),
    })),
  };
}

async function runMarketQuotesTool(input: { tickers: string[] }): Promise<MarketQuotesResult> {
  const dedupedTickers = Array.from(new Set(input.tickers.map((ticker) => ticker.toUpperCase()))).slice(0, 30);
  if (dedupedTickers.length === 0) {
    return { tickers: [], quotes: [] };
  }

  const [quotesBySymbol, ytdChanges, sectorsBySymbol] = await Promise.all([
    getQuotesResilient(dedupedTickers),
    Promise.all(dedupedTickers.map((symbol) => getYtdChangePercent(symbol))),
    getSectorsForSymbols(dedupedTickers),
  ]);

  return {
    tickers: dedupedTickers,
    quotes: dedupedTickers.map((ticker, index) => {
      const quote = quotesBySymbol[ticker];
      return {
        ticker,
        currentPrice: quote?.currentPrice ?? null,
        change1dPercent: quote?.change1dPercent ?? null,
        ytdChangePercent: ytdChanges[index] ?? null,
        sector: sectorsBySymbol[ticker] ?? quote?.sector ?? "Other",
      };
    }),
  };
}

async function runEcbDataTool(input: { dataset?: string; lastNObservations?: number }): Promise<EcbDataResult> {
  const dataset = input.dataset || "FM/B.U2.EUR.4F.KR.MRR_FR.LEV";
  const url = new URL(`https://data-api.ecb.europa.eu/service/data/${dataset}`);
  url.searchParams.set("format", "csvdata");
  url.searchParams.set("lastNObservations", String(input.lastNObservations ?? 2));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "text/csv",
      "User-Agent": "binturong-trace-agent/1.0",
    },
  });
  if (!res.ok) throw new Error(`get_ecb_data failed (${res.status})`);
  const text = await res.text();
  const rows = text.split("\n").filter(Boolean);

  return {
    dataset,
    observations: rows.slice(-3).map((row) => {
      const cols = row.split(",");
      return {
        period: cols[cols.length - 2] ?? "",
        value: cols[cols.length - 1] ?? "",
      };
    }),
  };
}

async function runFredIndicatorTool(
  env: Env,
  input: { series_id: string; limit?: number },
): Promise<FredIndicatorResult> {
  if (!env.FRED_API_KEY) {
    throw new Error("get_fred_indicator requires FRED_API_KEY secret");
  }

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", input.series_id);
  url.searchParams.set("api_key", env.FRED_API_KEY);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(input.limit ?? 3));

  const data = await fetchJson<{ observations?: Array<{ date?: string; value?: string }> }>(url.toString());
  return {
    series_id: input.series_id,
    observations: (data.observations ?? []).map((row) => ({
      date: row.date ?? "",
      value: row.value ?? "",
    })),
  };
}

function inferSourceFromUrl(rawUrl: string): string {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, "");
    return hostname || "unknown";
  } catch {
    return "unknown";
  }
}

function parseIsoDateOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isStaleByRecency(publishedAt: string | null, recencyDays: number): boolean {
  if (!publishedAt) return false;
  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedMs)) return false;
  const ageMs = Date.now() - publishedMs;
  return ageMs > recencyDays * 24 * 60 * 60 * 1000;
}

async function runWebSearchTool(
  env: Env,
  input: { query: string; limit?: number; recencyDays?: number; locale?: string },
): Promise<NewsSearchResult> {
  if (!env.GROK_SUB_API_KEY) {
    throw new Error("Missing GROK_SUB_API_KEY for xAI web search");
  }
  const limit = Math.max(1, Math.min(10, Number(input.limit ?? 6)));
  const recencyDays = Math.max(1, Math.min(365, Number(input.recencyDays ?? 60)));
  const locale = (input.locale ?? "en-US").trim() || "en-US";
  const webSearchModel = (env.GROK_WEB_SEARCH_MODEL ?? "grok-4-1-fast-reasoning").trim();

  const body = {
    model: webSearchModel,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Find recent web evidence for query: ${input.query}`,
              `Locale: ${locale}. Return up to ${limit} results.`,
              "Return strict JSON only in this format:",
              '{ "items": [{ "title": "...", "url": "...", "source": "...", "published_at": null, "snippet": "..." }] }',
              "Do not include markdown.",
            ].join("\n"),
          },
        ],
      },
    ],
    tools: [{ type: "web_search" }],
  };
  const res = await fetch(`${getGrokBaseUrl(env)}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROK_SUB_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`xAI web search failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const outputText =
    typeof raw.output_text === "string"
      ? raw.output_text
      : Array.isArray(raw.output)
        ? (raw.output as Array<Record<string, unknown>>)
            .flatMap((item) =>
              Array.isArray(item.content) ? (item.content as Array<Record<string, unknown>>) : [],
            )
            .map((content) => String(content.text ?? ""))
            .join("\n")
        : "";

  let rows: Array<Record<string, unknown>> = [];
  try {
    const parsed = extractJsonObject(outputText);
    rows = Array.isArray(parsed.items) ? (parsed.items as Array<Record<string, unknown>>) : [];
  } catch {
    rows = [];
  }

  if (rows.length === 0 && Array.isArray(raw.citations)) {
    rows = (raw.citations as Array<Record<string, unknown>>).map((citation) => ({
      title: citation.title ?? citation.name ?? "Untitled",
      url: citation.url ?? citation.link ?? "",
      source: citation.publisher ?? citation.source ?? null,
      published_at: citation.published_at ?? citation.date ?? null,
      snippet: citation.snippet ?? citation.text ?? "",
    }));
  }

  const items = rows.slice(0, limit).map((row) => {
    const url = String(row.url ?? row.link ?? "");
    const publishedAt = parseIsoDateOrNull(row.published_at ?? row.date ?? row.publishedAt);
    return {
      title: String(row.title ?? "Untitled"),
      url,
      source: String(row.source ?? row.publisher ?? inferSourceFromUrl(url)),
      snippet: String(row.snippet ?? row.summary ?? ""),
      published_at: publishedAt,
      is_stale: isStaleByRecency(publishedAt, recencyDays),
    };
  });
  if (items.length === 0) {
    throw new Error("xAI web search returned no parseable items");
  }
  return {
    query: input.query,
    items,
    provider: "xai_web_search",
    recencyDays,
    totalRetrieved: rows.length || items.length,
  };
}

async function runNewsSearchTool(
  input: { query: string; limit?: number; recencyDays?: number },
): Promise<NewsSearchResult> {
  const encoded = encodeURIComponent(input.query);
  const recencyDays = Math.max(1, Math.min(365, Number(input.recencyDays ?? 60)));
  const url = `https://news.google.com/rss/search?q=${encoded}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`search_news failed (${res.status})`);
  const xml = await res.text();
  const items = Array.from(xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g))
    .slice(0, input.limit ?? 6)
    .map((match) => ({
      title: match[1]?.replace(/<!\[CDATA\[|\]\]>/g, "") ?? "",
      url: match[2] ?? "",
      source: inferSourceFromUrl(match[2] ?? ""),
      snippet: "",
      published_at: null,
      is_stale: false,
    }));

  return {
    query: input.query,
    items,
    provider: "google_rss_fallback",
    recencyDays,
    totalRetrieved: items.length,
  };
}

function createGuardrailState(): GuardrailState {
  return {
    startedMs: Date.now(),
    totalCalls: 0,
    callsByTool: {
      portfolio_context: 0,
      market_quotes: 0,
      get_ecb_data: 0,
      get_fred_indicator: 0,
      search_news: 0,
    },
    maxTotalCalls: 12,
    perToolLimit: 4,
    maxDurationMs: 45_000,
  };
}

function getGrokBaseUrl(env: Env): string {
  return (env.GROK_API_BASE_URL || "https://api.x.ai/v1").replace(/\/$/, "");
}

async function invokeGrok(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  env: Env,
): Promise<string> {
  const res = await fetch(`${getGrokBaseUrl(env)}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Grok API error (${res.status}): ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as GrokChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Grok response did not include content");
  return content;
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error("Model output is not valid JSON");
  }
}

function normalizeSubAgentOutput(raw: Record<string, unknown>): SubAgentOutput {
  const evidenceRaw = Array.isArray(raw.evidence_items) ? raw.evidence_items : [];
  const findingsRaw = Array.isArray(raw.findings) ? raw.findings : [];
  const missingInfoRaw = Array.isArray(raw.missing_info) ? raw.missing_info : [];
  const retrievalMeta = (raw.retrieval_meta ?? {}) as Record<string, unknown>;
  const normalizedEvidence = evidenceRaw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const url = String(row.url ?? "");
      if (!/^https?:\/\//i.test(url)) return null;
      return {
        id: String(row.id ?? ""),
        thesis_id: String(row.thesis_id ?? ""),
        claim: String(row.claim ?? ""),
        snippet: String(row.snippet ?? ""),
        url,
        source: String(row.source ?? inferSourceFromUrl(url)),
        published_at: parseIsoDateOrNull(row.published_at),
        is_stale: Boolean(row.is_stale),
        staleness_reason: row.staleness_reason == null ? null : String(row.staleness_reason),
        relevance_score: Math.min(100, Math.max(0, Number(row.relevance_score ?? 50))),
        tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)) : [],
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> =>
        !!item && Boolean(item.id) && Boolean(item.thesis_id) && Boolean(item.claim),
    );

  const legacyEvidence = findingsRaw
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      const rawSources = Array.isArray(row.raw_sources)
        ? row.raw_sources.map((source) => String(source))
        : [];
      const url = rawSources.find((source) => /^https?:\/\//i.test(source)) ?? "";
      if (!url) return null;
      const thesisId = String(row.thesis_id ?? "");
      const claim = String(row.title ?? row.explanation ?? "");
      if (!thesisId || !claim) return null;
      return {
        id: `${thesisId}:legacy:${index}`,
        thesis_id: thesisId,
        claim,
        snippet: String(row.explanation ?? ""),
        url,
        source: inferSourceFromUrl(url),
        published_at: null,
        is_stale: false,
        staleness_reason: "legacy_sub_agent_format",
        relevance_score: Math.min(100, Math.max(0, Number(row.relevance_score ?? 50))),
        tags: ["legacy_findings"],
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item);

  const evidenceItems = normalizedEvidence.length > 0 ? normalizedEvidence : legacyEvidence;
  return {
    evidence_items: evidenceItems,
    missing_info: missingInfoRaw.map((value) => String(value)),
    retrieval_meta: {
      query: String(retrievalMeta.query ?? ""),
      provider:
        retrievalMeta.provider === "google_rss_fallback" ? "google_rss_fallback" : "xai_web_search",
      recency_days: Math.max(1, Math.min(365, Number(retrievalMeta.recency_days ?? 60))),
      total_retrieved: Math.max(0, Number(retrievalMeta.total_retrieved ?? 0)),
      total_kept: Math.max(0, Number(retrievalMeta.total_kept ?? 0)),
      total_stale: Math.max(0, Number(retrievalMeta.total_stale ?? 0)),
    },
  };
}

function normalizeMainAgentOutput(raw: Record<string, unknown>): MainAgentOutput {
  const signalsRaw = Array.isArray(raw.signals) ? raw.signals : [];
  return {
    signals: signalsRaw
      .map((item) => {
        const row = item as Record<string, unknown>;
        const signalType = String(row.signal_type ?? "neutral");
        if (!["at_risk", "supportive", "watch", "neutral"].includes(signalType)) return null;
        const riskHorizon = row.risk_horizon == null ? null : String(row.risk_horizon);
        const changeTypeRaw = String(row.change_type ?? "new_information");
        const changeType: "new_information" | "confirmation" | "contradiction" | "no_material_change" =
          changeTypeRaw === "confirmation" ||
          changeTypeRaw === "contradiction" ||
          changeTypeRaw === "no_material_change"
            ? changeTypeRaw
            : "new_information";
        return {
          thesis_id: String(row.thesis_id ?? ""),
          signal_type: signalType as "at_risk" | "supportive" | "watch" | "neutral",
          title: String(row.title ?? ""),
          explanation: String(row.explanation ?? ""),
          risk_horizon:
            riskHorizon && ["short_term", "long_term"].includes(riskHorizon)
              ? (riskHorizon as "short_term" | "long_term")
              : null,
          confidence: Math.min(100, Math.max(0, Number(row.confidence ?? 50))),
          evidence_ids: Array.isArray(row.evidence_ids)
            ? row.evidence_ids.map((id) => String(id)).filter(Boolean)
            : [],
          assumptions: Array.isArray(row.assumptions)
            ? row.assumptions.map((assumption) => String(assumption))
            : [],
          no_evidence_reason:
            row.no_evidence_reason == null ? null : String(row.no_evidence_reason),
          change_type: changeType,
          delta_summary: row.delta_summary == null ? null : String(row.delta_summary),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
    overall_summary: String(raw.overall_summary ?? ""),
    questions_for_user: Array.isArray(raw.questions_for_user)
      ? raw.questions_for_user.map((question) => String(question))
      : [],
  };
}

function validateMainAgentOutput(output: MainAgentOutput): void {
  for (const signal of output.signals) {
    if (signal.signal_type !== "neutral" && signal.evidence_ids.length === 0 && !signal.no_evidence_reason) {
      throw new Error("Model output missing required items: non-neutral signal missing evidence_ids");
    }
  }
}

function assertGuardrails(state: GuardrailState, tool: AgentToolName): void {
  if (Date.now() - state.startedMs > state.maxDurationMs) {
    throw new Error("Guardrail: run exceeded max duration");
  }
  if (state.totalCalls >= state.maxTotalCalls) {
    throw new Error("Guardrail: max tool calls exceeded");
  }
  if (state.callsByTool[tool] >= state.perToolLimit) {
    throw new Error(`Guardrail: per-tool call limit exceeded for ${tool}`);
  }
}

async function runToolWithGuardrails<TInput, TOutput>(
  state: GuardrailState,
  callLog: AgentToolCall[],
  tool: AgentToolName,
  input: TInput,
  runner: (input: TInput) => Promise<TOutput>,
): Promise<TOutput> {
  assertGuardrails(state, tool);
  state.totalCalls += 1;
  state.callsByTool[tool] += 1;

  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const output = await runner(input);
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;

  callLog.push({
    tool,
    startedAt,
    finishedAt,
    durationMs,
    inputSummary: {
      keys: Object.keys((input ?? {}) as Record<string, unknown>),
    },
    outputSummary:
      tool === "portfolio_context"
        ? {
            holdings: (output as PortfolioContextResult).holdings.length,
            theses: (output as PortfolioContextResult).theses.length,
          }
        : tool === "market_quotes"
          ? {
            quotes: (output as MarketQuotesResult).quotes.length,
            }
          : tool === "get_ecb_data"
            ? {
                observations: (output as EcbDataResult).observations.length,
              }
            : tool === "get_fred_indicator"
              ? {
                  observations: (output as FredIndicatorResult).observations.length,
                }
              : {
                  items: (output as NewsSearchResult).items.length,
                },
  });

  return output;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      return json(
        {
          error: "Server misconfiguration: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing",
        },
        500,
      );
    }

    // GET /api/health
    if (method === "GET" && pathname === "/api/health") {
      let supabase = "not_checked";
      try {
        const { error } = await db(env).from("portfolios").select("id").limit(1);
        supabase = error ? "error" : "connected";
      } catch {
        supabase = "error";
      }
      return json({ status: "ok", supabase, timestamp: new Date().toISOString() });
    }

    // Portfolios
    if (pathname === "/api/portfolios") {
      if (method === "GET") {
        const { data, error } = await db(env).from("portfolios").select("*");
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === "POST") {
        const body = await request.json();
        const { data, error } = await db(env).from("portfolios").insert(body).select();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }

    const portfolioMatch = pathname.match(/^\/api\/portfolios\/([^/]+)$/);
    if (portfolioMatch) {
      const id = portfolioMatch[1];
      if (method === "GET") {
        const { data, error } = await db(env).from("portfolios").select("*").eq("id", id).single();
        if (error) return json({ error: error.message }, 404);
        return json(data);
      }
      if (method === "PUT") {
        const body = await request.json();
        const { data, error } = await db(env).from("portfolios").update(body).eq("id", id).select();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === "DELETE") {
        const { error } = await db(env).from("portfolios").delete().eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      }
    }

    // Holdings
    if (pathname === "/api/holdings") {
      if (method === "GET") {
        const portfolioId = url.searchParams.get("portfolio_id");
        let query = db(env).from("holdings").select("*");
        if (portfolioId) query = query.eq("portfolio_id", portfolioId);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === "POST") {
        const body = await request.json();
        const { data, error } = await db(env).from("holdings").insert(body).select();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }

    // Market data
    if (method === "GET" && pathname === "/api/market/search") {
      const q = (url.searchParams.get("q") || "").trim();
      if (!q) return json([]);

      try {
        const searchUrl = new URL("https://query1.finance.yahoo.com/v1/finance/search");
        searchUrl.searchParams.set("q", q);
        searchUrl.searchParams.set("quotesCount", "10");
        searchUrl.searchParams.set("newsCount", "0");
        searchUrl.searchParams.set("enableFuzzyQuery", "false");
        searchUrl.searchParams.set("enableEnhancedTrivialQuery", "true");

        const result = await fetchJson<YahooSearchResponse>(searchUrl.toString());
        const quotes = (result.quotes || [])
          .filter((quote) => quote.symbol)
          .map((quote) => ({
            ticker: quote.symbol || "",
            name: quote.shortname || quote.longname || quote.symbol || "",
            exchange: quote.exchange || quote.fullExchangeName || "N/A",
            assetType: quote.quoteType || "N/A",
          }))
          .slice(0, 10);
        return json(quotes);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Search failed" }, 500);
      }
    }

    if (method === "GET" && pathname === "/api/market/quotes") {
      const symbols = parseSymbols(url.searchParams.get("symbols"));
      if (symbols.length === 0) return json([]);
      const [quotesBySymbol, ytdChanges, sectorsBySymbol] = await Promise.all([
        getQuotesResilient(symbols),
        Promise.all(symbols.map((symbol) => getYtdChangePercent(symbol))),
        getSectorsForSymbols(symbols),
      ]);

      const data = symbols.map((symbol, i) => {
        const quote =
          quotesBySymbol[symbol] ??
          ({
            currentPrice: null,
            change1dPercent: null,
            sector: null,
          } satisfies YahooQuoteItem);
        return {
          ticker: symbol,
          currentPrice: quote.currentPrice,
          change1dPercent: quote.change1dPercent,
          ytdChangePercent: ytdChanges[i],
          sector: sectorsBySymbol[symbol] ?? quote.sector ?? "Other",
        };
      });

      return json(data);
    }

    const holdingMatch = pathname.match(/^\/api\/holdings\/([^/]+)$/);
    if (holdingMatch) {
      const id = holdingMatch[1];
      if (method === "PUT") {
        const body = await request.json();
        const { data, error } = await db(env).from("holdings").update(body).eq("id", id).select();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === "DELETE") {
        const { error } = await db(env).from("holdings").delete().eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      }
    }

    // Agent runs
    if (pathname === "/api/agent/runs") {
      if (method === "GET") {
        const userId = url.searchParams.get("user_id");
        if (!userId) return json({ error: "user_id is required" }, 400);

        const portfolioId = url.searchParams.get("portfolio_id");
        let query = db(env)
          .from("agent_runs")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (portfolioId) query = query.eq("portfolio_id", portfolioId);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }

      if (method === "POST") {
        if (!env.AGENT_RUNS_QUEUE) {
          return json({ error: "Server misconfiguration: AGENT_RUNS_QUEUE binding is missing" }, 500);
        }

        const body = (await request.json()) as {
          userId?: string;
          portfolioId?: string;
          triggerType?: AgentRunTriggerType;
          allPortfolios?: boolean;
          idempotencyKey?: string;
          forceNew?: boolean;
        };

        if (!body.userId) return json({ error: "userId is required" }, 400);
        const triggerType = body.triggerType ?? "ondemand";
        if (!["scheduled", "ondemand"].includes(triggerType)) {
          return json({ error: "triggerType must be scheduled or ondemand" }, 400);
        }

        const portfolioIds = body.allPortfolios
          ? await listUserPortfolioIds(env, body.userId)
          : body.portfolioId
            ? [body.portfolioId]
            : [];

        if (portfolioIds.length === 0) {
          return json({ error: "No target portfolios found" }, 400);
        }

        const runs: AgentRunRow[] = [];
        for (const portfolioId of portfolioIds) {
          const run = await createRun(env, {
            userId: body.userId,
            portfolioId,
            triggerType,
            idempotencyKey: body.forceNew ? crypto.randomUUID() : body.idempotencyKey,
          });
          runs.push(run);
        }

        await Promise.all(runs.map((run) => queueRun(env, run)));
        return json(
          {
            queued: runs.length,
            runs: runs.map((run) => ({
              id: run.id,
              portfolioId: run.portfolio_id,
              status: run.status,
              idempotencyKey: run.idempotency_key,
              createdAt: run.created_at,
            })),
          },
          201,
        );
      }
    }

    if (pathname === "/api/agent/settings") {
      if (method === "GET") {
        const userId = url.searchParams.get("user_id");
        if (!userId) return json({ error: "user_id is required" }, 400);

        const { data, error } = await db(env)
          .from("agent_user_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        return json(
          data ?? {
            user_id: userId,
            timezone: "Europe/Paris",
            global_runs_per_day: 2,
            auto_apply_enabled: false,
            auto_apply_min_confidence: 0.8,
          },
        );
      }

      if (method === "PUT") {
        const body = (await request.json()) as {
          userId?: string;
          timezone?: string;
          globalRunsPerDay?: number;
          autoApplyEnabled?: boolean;
          autoApplyMinConfidence?: number;
        };
        if (!body.userId) return json({ error: "userId is required" }, 400);

        const payload = {
          user_id: body.userId,
          timezone: body.timezone ?? "Europe/Paris",
          global_runs_per_day: Math.max(1, Math.min(3, Number(body.globalRunsPerDay ?? 2))),
          auto_apply_enabled: Boolean(body.autoApplyEnabled ?? false),
          auto_apply_min_confidence: Math.max(
            0,
            Math.min(1, Number(body.autoApplyMinConfidence ?? 0.8)),
          ),
        };

        const { data, error } = await db(env)
          .from("agent_user_settings")
          .upsert(payload, { onConflict: "user_id" })
          .select("*")
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 200);
      }
    }

    if (pathname === "/api/agent/portfolio-settings") {
      if (method === "GET") {
        const userId = url.searchParams.get("user_id");
        if (!userId) return json({ error: "user_id is required" }, 400);

        const { data, error } = await db(env)
          .from("agent_portfolio_settings")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        if (error) return json({ error: error.message }, 500);
        return json(data ?? []);
      }

      if (method === "PUT") {
        const body = (await request.json()) as {
          userId?: string;
          portfolioId?: string;
          runsPerDayOverride?: number | null;
          agentEnabled?: boolean;
        };
        if (!body.userId || !body.portfolioId) {
          return json({ error: "userId and portfolioId are required" }, 400);
        }

        const payload = {
          user_id: body.userId,
          portfolio_id: body.portfolioId,
          runs_per_day_override:
            body.runsPerDayOverride == null
              ? null
              : Math.max(1, Math.min(3, Number(body.runsPerDayOverride))),
          agent_enabled: body.agentEnabled == null ? true : Boolean(body.agentEnabled),
        };

        const { data, error } = await db(env)
          .from("agent_portfolio_settings")
          .upsert(payload, { onConflict: "portfolio_id" })
          .select("*")
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 200);
      }
    }

    if (pathname === "/api/agent/metrics") {
      if (method !== "GET") return json({ error: "Method not allowed" }, 405);
      const userId = url.searchParams.get("user_id");
      if (!userId) return json({ error: "user_id is required" }, 400);

      const hours = Math.max(1, Math.min(168, Number(url.searchParams.get("hours") ?? 24)));
      const fromIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await db(env)
        .from("agent_runs")
        .select("id,status,trigger_type,created_at,started_at,finished_at,error_code")
        .eq("user_id", userId)
        .gte("created_at", fromIso)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) return json({ error: error.message }, 500);

      return json(summarizeRunMetrics(data ?? [], { hours, fromIso }), 200);
    }

    if (pathname === "/api/agent/feed") {
      if (method !== "GET") return json({ error: "Method not allowed" }, 405);
      const userId = url.searchParams.get("user_id");
      if (!userId) return json({ error: "user_id is required" }, 400);
      const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 50)));

      const { data, error } = await db(env)
        .from("agent_runs")
        .select("id,portfolio_id,created_at,token_usage,status,trigger_type")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return json({ error: error.message }, 500);

      const insights = (data ?? [])
        .flatMap((run) => {
          const tokenUsage = (run.token_usage ?? {}) as Record<string, unknown>;
          const main = (
            tokenUsage.impact_stage ??
            tokenUsage.main_agent ??
            {}
          ) as Record<string, unknown>;
          const signals = Array.isArray(main.signals)
            ? (main.signals as Array<Record<string, unknown>>)
            : [];
          return signals.map((signal, index) => {
            const type = String(signal.signal_type ?? "neutral");
            const status =
              type === "at_risk"
                ? "At risk"
                : type === "supportive"
                  ? "Supportive"
                  : type === "watch"
                    ? "Watch"
                    : "Neutral";
            return {
              id: `${run.id}:${index}`,
              run_id: run.id,
              portfolio_id: run.portfolio_id,
              created_at: run.created_at,
              trigger_type: run.trigger_type,
              source: "agent",
              thesis_id: String(signal.thesis_id ?? ""),
              status,
              headline: String(signal.title ?? "Agent signal"),
              body: String(signal.explanation ?? ""),
              confidence: Number(signal.confidence ?? 50),
              risk_horizon:
                signal.risk_horizon == null ? null : String(signal.risk_horizon),
              evidence_ids: Array.isArray(signal.evidence_ids)
                ? signal.evidence_ids.map((id) => String(id))
                : [],
              change_type: String(signal.change_type ?? "new_information"),
              delta_summary:
                signal.delta_summary == null ? null : String(signal.delta_summary),
              questions_for_user: Array.isArray(main.questions_for_user)
                ? main.questions_for_user.map((question) => String(question))
                : [],
            };
          });
        })
        .reduce<Array<Record<string, unknown>>>((acc, insight) => {
          const thesisId = String(insight.thesis_id ?? "");
          const prior = acc.find((item) => String(item.thesis_id ?? "") === thesisId);
          if (String(insight.change_type ?? "") === "no_material_change" && prior) {
            return acc;
          }
          acc.push(insight);
          return acc;
        }, [])
        .slice(0, limit);

      return json({ insights }, 200);
    }

    if (pathname === "/api/agent/alerts") {
      if (method !== "GET") return json({ error: "Method not allowed" }, 405);
      const userId = url.searchParams.get("user_id");
      if (!userId) return json({ error: "user_id is required" }, 400);

      const hours = Math.max(1, Math.min(168, Number(url.searchParams.get("hours") ?? 24)));
      const queueDepthThreshold = Math.max(
        1,
        Math.min(200, Number(url.searchParams.get("queue_depth_threshold") ?? 5)),
      );
      const successRateThreshold = Math.max(
        0,
        Math.min(1, Number(url.searchParams.get("success_rate_threshold") ?? 0.9)),
      );
      const p95MsThreshold = Math.max(
        1000,
        Math.min(60 * 60 * 1000, Number(url.searchParams.get("p95_ms_threshold") ?? 120000)),
      );
      const fromIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await db(env)
        .from("agent_runs")
        .select("status,trigger_type,started_at,finished_at,error_code")
        .eq("user_id", userId)
        .gte("created_at", fromIso)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) return json({ error: error.message }, 500);

      const metrics = summarizeRunMetrics(data ?? [], { hours, fromIso });
      const alerts = [
        {
          key: "queue_depth_high",
          triggered: metrics.queue_depth >= queueDepthThreshold,
          value: metrics.queue_depth,
          threshold: queueDepthThreshold,
        },
        {
          key: "success_rate_low",
          triggered:
            metrics.success_rate != null && metrics.success_rate <= successRateThreshold,
          value: metrics.success_rate,
          threshold: successRateThreshold,
        },
        {
          key: "p95_latency_high",
          triggered:
            metrics.duration_ms.p95 != null && metrics.duration_ms.p95 >= p95MsThreshold,
          value: metrics.duration_ms.p95,
          threshold: p95MsThreshold,
        },
      ];

      return json(
        {
          window_hours: hours,
          thresholds: {
            queue_depth_threshold: queueDepthThreshold,
            success_rate_threshold: successRateThreshold,
            p95_ms_threshold: p95MsThreshold,
          },
          alerts,
          metrics,
        },
        200,
      );
    }

    if (pathname === "/api/agent/scheduled/fanout") {
      if (method !== "POST") return json({ error: "Method not allowed" }, 405);

      const body = (await request.json().catch(() => ({}))) as {
        dryRun?: boolean;
        nowIso?: string;
      };
      const now = body.nowIso ? new Date(body.nowIso) : new Date();
      if (Number.isNaN(now.getTime())) {
        return json({ error: "Invalid nowIso" }, 400);
      }

      const result = await runScheduledFanout(env, {
        now,
        dryRun: Boolean(body.dryRun),
        source: "manual",
      });
      return json(result, 200);
    }

    const cancelRunMatch = pathname.match(/^\/api\/agent\/runs\/([^/]+)\/cancel$/);
    if (cancelRunMatch && method === "POST") {
      const runId = cancelRunMatch[1];
      const { data, error } = await db(env)
        .from("agent_runs")
        .update({
          status: "cancelled",
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId)
        .in("status", ["queued", "running"])
        .select("*")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    return json({ error: "Not found" }, 404);
  },
  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      await runScheduledFanout(env, {
        now: new Date(controller.scheduledTime),
        source: "cron",
      });
    } catch (error) {
      console.error("scheduled fanout failed", error);
    }
  },
  async queue(batch: MessageBatch<AgentRunQueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const runId = message.body.runId;
      try {
        const guardrails = createGuardrailState();
        const toolCalls: AgentToolCall[] = [];
        const start = new Date().toISOString();
        await db(env)
          .from("agent_runs")
          .update({ status: "running", started_at: start })
          .eq("id", runId)
          .eq("status", "queued");

        const context = await runToolWithGuardrails(
          guardrails,
          toolCalls,
          "portfolio_context",
          {
            userId: message.body.userId,
            portfolioId: message.body.portfolioId,
          },
          (input) => runPortfolioContextTool(env, input),
        );

        const contextTickers = Array.from(
          new Set([
            ...context.holdings.map((holding) => holding.ticker),
            ...context.theses.flatMap((thesis) => thesis.tickers),
          ]),
        );

        const quotes = await runToolWithGuardrails(
          guardrails,
          toolCalls,
          "market_quotes",
          {
            tickers: contextTickers,
          },
          (input) => runMarketQuotesTool(input),
        );

        const ecbData = await runToolWithGuardrails(
          guardrails,
          toolCalls,
          "get_ecb_data",
          {
            dataset: "FM/B.U2.EUR.4F.KR.MRR_FR.LEV",
            lastNObservations: 2,
          },
          (input) => runEcbDataTool(input),
        );

        const fredData = await runToolWithGuardrails(
          guardrails,
          toolCalls,
          "get_fred_indicator",
          {
            series_id: "FEDFUNDS",
            limit: 3,
          },
          (input) => runFredIndicatorTool(env, input),
        );

        if (!env.GROK_SUB_API_KEY || !env.GROK_MAIN_API_KEY) {
          throw new Error(
            "Missing GROK_SUB_API_KEY or GROK_MAIN_API_KEY. Set both secrets before Phase 4 processing.",
          );
        }

        const subPass1SystemPrompt =
          env.SUB_AGENT_PLANNING_SYSTEM_PROMPT ??
          [
            "You are a thesis classification agent.",
            "Return strict JSON only with keys classifications and search_queries.",
            "classifications[]: { thesis_id, established_facts, claims_to_verify, signals_to_monitor, etf_underlying }.",
            "Each classification must include at least 2 concrete signals_to_monitor.",
            "search_queries[] should be concept-driven and grounded in thesis wording.",
            "Do not copy thesis title verbatim as the full query.",
          ].join(" ");

        const subPass1UserPrompt = JSON.stringify(
          {
            portfolioId: message.body.portfolioId,
            thesis_input: context.theses,
          },
          null,
          2,
        );

        const subPass1Raw = await invokeGrok(
          env.GROK_SUB_API_KEY,
          "grok-4-1-fast-reasoning",
          subPass1SystemPrompt,
          subPass1UserPrompt,
          env,
        );
        const subPass1Output = normalizeSubAgentPlanningOutput(
          extractJsonObject(subPass1Raw),
        );
        if (subPass1Output.classifications.length === 0) {
          subPass1Output.classifications = context.theses.map((thesis) => ({
            thesis_id: thesis.id,
            established_facts: [thesis.title],
            claims_to_verify: thesis.summary ? [thesis.summary] : [thesis.title],
            signals_to_monitor: [],
            etf_underlying: null,
          }));
        }
        subPass1Output.classifications = subPass1Output.classifications.map((classification) => {
          if (classification.signals_to_monitor.length >= 2) return classification;
          const seeds = [
            ...classification.claims_to_verify,
            ...classification.established_facts,
          ]
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 2);
          const defaults = seeds.length > 0 ? seeds : ["earnings revisions", "policy changes"];
          return {
            ...classification,
            signals_to_monitor: defaults,
          };
        });
        const thesisDescriptors = context.theses.map((thesis) => ({
          id: thesis.id,
          descriptor: `${thesis.title} ${thesis.summary} ${thesis.tickers.join(" ")}`.trim(),
        }));
        const fallbackThesisIds = subPass1Output.classifications
          .map((classification) => classification.thesis_id)
          .filter(Boolean);
        let fallbackCursor = 0;
        subPass1Output.search_queries = subPass1Output.search_queries.map((item) => {
          if (item.thesis_id) return item;
          const inferredId = inferThesisIdForQuery(item.query, thesisDescriptors);
          if (inferredId) return { ...item, thesis_id: inferredId };
          const fallbackId =
            fallbackThesisIds.length > 0
              ? fallbackThesisIds[fallbackCursor++ % fallbackThesisIds.length]!
              : "";
          return { ...item, thesis_id: fallbackId };
        });
        subPass1Output.raw_search_queries = subPass1Output.search_queries.map((item) => ({
          thesis_id: item.thesis_id,
          query: item.query,
        }));
        if (subPass1Output.search_queries.length === 0) {
          subPass1Output.search_queries = context.theses
            .map((thesis) => ({
              thesis_id: thesis.id,
              query: toConceptQuery({
                title: thesis.title,
                summary: thesis.summary,
                tickers: thesis.tickers,
              }),
            }))
            .filter((item) => Boolean(item.query))
            .slice(0, 8);
        }
        const newsQuery =
          subPass1Output.search_queries
            .map((item) => item.query.trim())
            .filter(Boolean)
            .join(" OR ")
            .trim() ||
          contextTickers.slice(0, 5).join(" OR ") ||
          "global markets macro";
        let news: NewsSearchResult;
        let webSearchFallbackReason: string | null = null;
        try {
          news = await runToolWithGuardrails(
            guardrails,
            toolCalls,
            "search_news",
            {
              query: newsQuery,
              limit: 8,
              recencyDays: 60,
              locale: "en-US",
            },
            (input) => runWebSearchTool(env, input),
          );
        } catch (error) {
          webSearchFallbackReason = error instanceof Error ? error.message : "xAI web search failed";
          news = await runToolWithGuardrails(
            guardrails,
            toolCalls,
            "search_news",
            {
              query: newsQuery,
              limit: 8,
              recencyDays: 60,
            },
            (input) => runNewsSearchTool(input),
          );
        }

        const subSystemPrompt =
          env.SUB_AGENT_SYSTEM_PROMPT ??
          [
            "You are an evidence extraction agent for investment theses.",
            "Extract external evidence only and never rewrite the user's thesis.",
            "Return strict JSON only with keys evidence_items, missing_info, retrieval_meta.",
            "evidence_items[]: { id, thesis_id, claim, snippet, url, source, published_at, is_stale, staleness_reason, relevance_score, tags }.",
            "Hard rule: no recommendations. Hard rule: every claim must cite url.",
          ].join(" ");

        const subUserPrompt = JSON.stringify(
          {
            portfolioId: message.body.portfolioId,
            thesis_input: context.theses,
            thesis_classification: subPass1Output,
            retrieval_input: {
              holdings: context.holdings,
              quotes: quotes.quotes,
              ecb_data: ecbData,
              fred_data: fredData,
              web_results: news.items,
            },
            policy: {
              recency_days: news.recencyDays,
              stale_rule: "Mark evidence stale when published_at is older than recency_days",
            },
          },
          null,
          2,
        );

        const subRaw = await invokeGrok(
          env.GROK_SUB_API_KEY,
          "grok-4-1-fast-reasoning",
          subSystemPrompt,
          subUserPrompt,
          env,
        );
        const subOutput = normalizeSubAgentOutput(extractJsonObject(subRaw));
        if (subOutput.evidence_items.length === 0) {
          const fallbackEvidence = context.theses
            .map((thesis, index) => {
              const source = news.items[index % Math.max(1, news.items.length)];
              const fallbackUrl = source?.url || "https://news.google.com";
              return {
                id: `${thesis.id}:fallback:${index}`,
                thesis_id: thesis.id,
                claim:
                  source?.title ||
                  `No extractable evidence found for thesis "${thesis.title}" in this run`,
                snippet:
                  source?.snippet ||
                  "Fallback evidence item generated because sub-agent returned no structured evidence.",
                url: fallbackUrl,
                source: inferSourceFromUrl(fallbackUrl),
                published_at: source?.published_at ?? null,
                is_stale: Boolean(source?.is_stale),
                staleness_reason: "sub_agent_empty_fallback",
                relevance_score: 25,
                tags: ["fallback", "low_confidence"],
              };
            })
            .slice(0, 8);
          if (fallbackEvidence.length === 0) {
            throw new Error("Model output missing required items: sub_agent.evidence_items is empty");
          }
          subOutput.evidence_items = fallbackEvidence;
          subOutput.missing_info = [
            ...subOutput.missing_info,
            "Sub-agent returned empty evidence_items; fallback evidence synthesized from retrieval inputs.",
          ];
        }

        const mainSystemPrompt =
          env.MAIN_AGENT_SYSTEM_PROMPT ??
          [
            "You are a thesis impact reasoning agent.",
            "Bridge user thesis intent with extracted external evidence.",
            "Return strict JSON only with keys: signals, overall_summary, questions_for_user.",
            "Each signal: { thesis_id, signal_type, title, explanation, risk_horizon, confidence, evidence_ids, assumptions, no_evidence_reason, change_type, delta_summary }.",
            "Do not treat evidence titles as user thesis text.",
          ].join(" ");

        const mainUserPrompt = JSON.stringify(
          {
            portfolioId: message.body.portfolioId,
            thesis_input: context.theses,
            portfolio_context: {
              holdings: context.holdings,
            },
            evidence_items: subOutput.evidence_items,
          },
          null,
          2,
        );

        const mainRaw = await invokeGrok(
          env.GROK_MAIN_API_KEY,
          "grok-4.20-0309-reasoning",
          mainSystemPrompt,
          mainUserPrompt,
          env,
        );
        const mainOutput = normalizeMainAgentOutput(extractJsonObject(mainRaw));
        validateMainAgentOutput(mainOutput);
        if (mainOutput.signals.length === 0) {
          throw new Error("Model output missing required items: main_agent.signals is empty");
        }

        await db(env)
          .from("agent_runs")
          .update({
            status: "completed",
            finished_at: new Date().toISOString(),
            token_usage: {
              phase: "phase11_evidence_impact_pipeline_v2",
              processed_by: "cloudflare_queue_consumer",
              guardrails: {
                maxTotalCalls: guardrails.maxTotalCalls,
                perToolLimit: guardrails.perToolLimit,
                maxDurationMs: guardrails.maxDurationMs,
                callsByTool: guardrails.callsByTool,
                totalCalls: guardrails.totalCalls,
                durationMs: Date.now() - guardrails.startedMs,
              },
              context: {
                holdings: context.holdings.length,
                theses: context.theses.length,
                tickers: contextTickers.length,
              },
              quotes: {
                count: quotes.quotes.length,
              },
              macro: {
                ecb_observations: ecbData.observations.length,
                fred_observations: fredData.observations.length,
              },
              news: {
                count: news.items.length,
                query: news.query,
                provider: news.provider,
                recency_days: news.recencyDays,
                total_retrieved: news.totalRetrieved,
                fallback_reason:
                  news.provider === "google_rss_fallback" ? webSearchFallbackReason : null,
              },
              tool_calls: toolCalls,
              classification_stage: subPass1Output,
              evidence_stage: subOutput,
              impact_stage: mainOutput,
              sub_agent: subOutput,
              main_agent: mainOutput,
            },
          })
          .eq("id", runId)
          .neq("status", "cancelled");

        message.ack();
      } catch (error) {
        const classified = classifyQueueProcessingError(error);
        await db(env)
          .from("agent_runs")
          .update({
            status: classified.statusOverride ?? "failed",
            finished_at: new Date().toISOString(),
            error_code: classified.errorCode,
            error_detail: classified.detail,
            token_usage: {
              phase: "phase8_failure_classification_v1",
              failure_class: classified.failureClass,
              retryable: classified.retryable,
            },
          })
          .eq("id", runId);
        if (classified.retryable) message.retry();
        else message.ack();
      }
    }
  },
} satisfies ExportedHandler<Env, AgentRunQueueMessage>;
