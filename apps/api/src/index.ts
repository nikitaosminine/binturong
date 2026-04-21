import { createClient } from "@supabase/supabase-js";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_ANON_KEY: string;
  AGENT_RUNS_QUEUE: Queue<AgentRunQueueMessage>;
  GROK_MAIN_API_KEY?: string;
  GROK_SUB_API_KEY?: string;
  GROK_API_BASE_URL?: string;
  MAIN_AGENT_SYSTEM_PROMPT?: string;
  SUB_AGENT_SYSTEM_PROMPT?: string;
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

type AgentToolName = "portfolio_context" | "market_quotes";

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

interface GuardrailState {
  startedMs: number;
  totalCalls: number;
  callsByTool: Record<AgentToolName, number>;
  maxTotalCalls: number;
  perToolLimit: number;
  maxDurationMs: number;
}

interface SubAgentOutput {
  macro_summary: string;
  news_summary: string;
  signals: Array<{
    ticker: string;
    status: "supportive" | "watch" | "risk";
    reason: string;
  }>;
  overall_risk: "low" | "med" | "high";
  confidence: number;
}

interface MainAgentOutput {
  impact: "confirmed" | "watch" | "risk";
  horizon_impact: "short_term" | "long_term" | "both";
  rationale: string;
  recommendations: string[];
  confidence: number;
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
    return `${input.userId}:${input.portfolioId}:${input.triggerType}:${dayWindow}`;
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
        .select("id,title,tickers,status")
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

function createGuardrailState(): GuardrailState {
  return {
    startedMs: Date.now(),
    totalCalls: 0,
    callsByTool: {
      portfolio_context: 0,
      market_quotes: 0,
    },
    maxTotalCalls: 8,
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
  const signalsRaw = Array.isArray(raw.signals) ? raw.signals : [];
  return {
    macro_summary: String(raw.macro_summary ?? ""),
    news_summary: String(raw.news_summary ?? ""),
    signals: signalsRaw
      .map((item) => {
        const row = item as Record<string, unknown>;
        const status = String(row.status ?? "watch");
        if (!["supportive", "watch", "risk"].includes(status)) return null;
        return {
          ticker: String(row.ticker ?? ""),
          status: status as "supportive" | "watch" | "risk",
          reason: String(row.reason ?? ""),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
    overall_risk: (["low", "med", "high"].includes(String(raw.overall_risk))
      ? String(raw.overall_risk)
      : "med") as "low" | "med" | "high",
    confidence: Math.min(1, Math.max(0, Number(raw.confidence ?? 0.5))),
  };
}

function normalizeMainAgentOutput(raw: Record<string, unknown>): MainAgentOutput {
  const impact = String(raw.impact ?? "watch");
  const horizon = String(raw.horizon_impact ?? "both");
  return {
    impact: (["confirmed", "watch", "risk"].includes(impact) ? impact : "watch") as
      | "confirmed"
      | "watch"
      | "risk",
    horizon_impact: (["short_term", "long_term", "both"].includes(horizon) ? horizon : "both") as
      | "short_term"
      | "long_term"
      | "both",
    rationale: String(raw.rationale ?? ""),
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map((item) => String(item))
      : [],
    confidence: Math.min(1, Math.max(0, Number(raw.confidence ?? 0.5))),
  };
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
        : {
            quotes: (output as MarketQuotesResult).quotes.length,
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

        if (!env.GROK_SUB_API_KEY || !env.GROK_MAIN_API_KEY) {
          throw new Error(
            "Missing GROK_SUB_API_KEY or GROK_MAIN_API_KEY. Set both secrets before Phase 4 processing.",
          );
        }

        const subSystemPrompt =
          env.SUB_AGENT_SYSTEM_PROMPT ??
          [
            "You are a sub-agent market signal analyst.",
            "Return strict JSON only with keys:",
            "macro_summary, news_summary, signals[], overall_risk, confidence.",
            "signals[] items: { ticker, status: supportive|watch|risk, reason }",
          ].join(" ");

        const subUserPrompt = JSON.stringify(
          {
            portfolioId: message.body.portfolioId,
            holdings: context.holdings,
            theses: context.theses,
            quotes: quotes.quotes,
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

        const mainSystemPrompt =
          env.MAIN_AGENT_SYSTEM_PROMPT ??
          [
            "You are a main thesis impact analyst.",
            "Return strict JSON only with keys:",
            "impact, horizon_impact, rationale, recommendations, confidence.",
            "impact: confirmed|watch|risk.",
            "horizon_impact: short_term|long_term|both.",
          ].join(" ");

        const mainUserPrompt = JSON.stringify(
          {
            portfolioId: message.body.portfolioId,
            context: {
              holdings: context.holdings,
              theses: context.theses,
            },
            sub_agent: subOutput,
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

        await db(env)
          .from("agent_runs")
          .update({
            status: "completed",
            finished_at: new Date().toISOString(),
            token_usage: {
              phase: "phase4_model_orchestration_v1",
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
              tool_calls: toolCalls,
              sub_agent: subOutput,
              main_agent: mainOutput,
            },
          })
          .eq("id", runId)
          .neq("status", "cancelled");

        message.ack();
      } catch (error) {
        await db(env)
          .from("agent_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_code: "QUEUE_PROCESSING_ERROR",
            error_detail: error instanceof Error ? error.message : "Unknown queue processing error",
          })
          .eq("id", runId);
        message.retry();
      }
    }
  },
} satisfies ExportedHandler<Env, AgentRunQueueMessage>;
