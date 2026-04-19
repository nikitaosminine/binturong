import { createClient } from "@supabase/supabase-js";
import yahooFinance from "yahoo-finance2";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_ANON_KEY: string;
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

async function getYtdChangePercent(symbol: string): Promise<number | null> {
  try {
    const now = new Date();
    const ytdStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const candles = await yahooFinance.historical(symbol, {
      period1: ytdStart,
      period2: now,
      interval: "1d",
    });
    if (!candles.length) return null;

    const firstClose = candles.find((c) => c?.close != null)?.close;
    const lastClose = [...candles].reverse().find((c) => c?.close != null)?.close;
    if (!firstClose || !lastClose) return null;

    return ((lastClose - firstClose) / firstClose) * 100;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
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
        const result = await yahooFinance.search(q, {
          quotesCount: 10,
          enableNavLinks: false,
          enableCb: false,
          newsCount: 0,
        });
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

      try {
        const [quotes, ytdChanges] = await Promise.all([
          Promise.all(symbols.map((symbol) => yahooFinance.quote(symbol))),
          Promise.all(symbols.map((symbol) => getYtdChangePercent(symbol))),
        ]);

        const data = symbols.map((symbol, i) => {
          const quote = quotes[i];
          const current =
            quote.regularMarketPrice ?? quote.postMarketPrice ?? quote.preMarketPrice ?? null;
          return {
            ticker: symbol,
            currentPrice: current,
            change1dPercent: quote.regularMarketChangePercent ?? null,
            ytdChangePercent: ytdChanges[i],
          };
        });

        return json(data);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Quote lookup failed" }, 500);
      }
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

    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
