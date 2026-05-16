"use client";

import { currencyRateKey, normalizeCurrencyCode } from "@/lib/currency";

export const MARKET_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

const CACHE_VERSION = 1;
const QUOTE_CACHE_KEY = "binturong.market.quotes.v1";
const FX_CACHE_KEY = "binturong.market.fx.v1";

interface CacheEnvelope<T> {
  version: number;
  entries: Record<string, T>;
}

export interface CachedMarketQuote {
  ticker: string;
  currentPrice: number | null;
  currency: string | null;
  change1dPercent?: number | null;
  ytdChangePercent?: number | null;
  sector?: string | null;
  assetType?: string | null;
  lastPriceUpdatedAt?: string | null;
  cachedAt: number;
}

export interface CachedFxRate {
  rate: number;
  cachedAt: number;
}

export interface CacheReadResult<T> {
  entries: Record<string, T>;
  hasAll: boolean;
  hasAny: boolean;
  shouldRefetch: boolean;
}

interface MarketQuoteForCache {
  ticker: string;
  currentPrice: number | null;
  currency?: string | null;
  change1dPercent?: number | null;
  ytdChangePercent?: number | null;
  sector?: string | null;
  assetType?: string | null;
  lastPriceUpdatedAt?: string | null;
}

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCache<T>(key: string): Record<string, T> {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
    if (parsed.version !== CACHE_VERSION || !parsed.entries || typeof parsed.entries !== "object") {
      return {};
    }
    return parsed.entries;
  } catch {
    return {};
  }
}

function writeCache<T>(key: string, entries: Record<string, T>) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ version: CACHE_VERSION, entries }));
  } catch {
    // Cache writes are best-effort; UI should never depend on storage being writable.
  }
}

function normalizeTicker(ticker: string | null | undefined) {
  return String(ticker ?? "")
    .trim()
    .toUpperCase();
}

function isStale(cachedAt: number, maxAgeMs: number) {
  return !Number.isFinite(cachedAt) || Date.now() - cachedAt > maxAgeMs;
}

function isQuoteEntry(entry: CachedMarketQuote | undefined): entry is CachedMarketQuote {
  return Boolean(
    entry &&
    normalizeTicker(entry.ticker) &&
    (entry.currentPrice == null || Number.isFinite(entry.currentPrice)) &&
    Number.isFinite(entry.cachedAt),
  );
}

function isFxEntry(entry: CachedFxRate | undefined): entry is CachedFxRate {
  return Boolean(
    entry && Number.isFinite(entry.rate) && entry.rate > 0 && Number.isFinite(entry.cachedAt),
  );
}

export function getCachedQuotes(
  tickers: string[],
  maxAgeMs = MARKET_CACHE_MAX_AGE_MS,
): CacheReadResult<CachedMarketQuote> {
  const cache = readCache<CachedMarketQuote>(QUOTE_CACHE_KEY);
  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTicker).filter(Boolean)));
  const entries: Record<string, CachedMarketQuote> = {};
  let hasAll = uniqueTickers.length > 0;
  let hasAny = false;
  let shouldRefetch = false;

  for (const ticker of uniqueTickers) {
    const entry = cache[ticker];
    if (!isQuoteEntry(entry)) {
      hasAll = false;
      shouldRefetch = true;
      continue;
    }
    entries[ticker] = { ...entry, ticker };
    hasAny = true;
    if (isStale(entry.cachedAt, maxAgeMs)) shouldRefetch = true;
  }

  return { entries, hasAll, hasAny, shouldRefetch };
}

export function upsertCachedQuotes(quotes: MarketQuoteForCache[]) {
  const cache = readCache<CachedMarketQuote>(QUOTE_CACHE_KEY);
  const cachedAt = Date.now();

  for (const quote of quotes) {
    const ticker = normalizeTicker(quote.ticker);
    if (!ticker) continue;
    cache[ticker] = {
      ticker,
      currentPrice:
        quote.currentPrice != null && Number.isFinite(quote.currentPrice)
          ? quote.currentPrice
          : null,
      currency: quote.currency ? normalizeCurrencyCode(quote.currency) : null,
      change1dPercent:
        quote.change1dPercent != null && Number.isFinite(quote.change1dPercent)
          ? quote.change1dPercent
          : null,
      ytdChangePercent:
        quote.ytdChangePercent != null && Number.isFinite(quote.ytdChangePercent)
          ? quote.ytdChangePercent
          : null,
      sector: quote.sector ?? null,
      assetType: quote.assetType ?? null,
      lastPriceUpdatedAt: quote.lastPriceUpdatedAt ?? null,
      cachedAt,
    };
  }

  writeCache(QUOTE_CACHE_KEY, cache);
}

export function getCachedFxRates(
  rateKeys: string[],
  maxAgeMs = MARKET_CACHE_MAX_AGE_MS,
): CacheReadResult<number> {
  const cache = readCache<CachedFxRate>(FX_CACHE_KEY);
  const uniqueKeys = Array.from(
    new Set(rateKeys.map((key) => key.trim().toUpperCase()).filter(Boolean)),
  );
  const entries: Record<string, number> = {};
  let hasAll = true;
  let hasAny = false;
  let shouldRefetch = false;

  for (const key of uniqueKeys) {
    const entry = cache[key];
    if (!isFxEntry(entry)) {
      hasAll = false;
      shouldRefetch = true;
      continue;
    }
    entries[key] = entry.rate;
    hasAny = true;
    if (isStale(entry.cachedAt, maxAgeMs)) shouldRefetch = true;
  }

  return { entries, hasAll, hasAny, shouldRefetch };
}

export function upsertCachedFxRates(rates: Record<string, number>) {
  const cache = readCache<CachedFxRate>(FX_CACHE_KEY);
  const cachedAt = Date.now();

  for (const [key, rate] of Object.entries(rates)) {
    const normalizedKey = key.trim().toUpperCase();
    if (!normalizedKey || !Number.isFinite(rate) || rate <= 0) continue;
    cache[normalizedKey] = { rate, cachedAt };
  }

  writeCache(FX_CACHE_KEY, cache);
}

export function getFxRateKeys(
  sourceCurrencies: Array<string | null | undefined>,
  targetCurrencies: Array<string | null | undefined>,
) {
  const targets = Array.from(
    new Set(targetCurrencies.map((currency) => normalizeCurrencyCode(currency)).filter(Boolean)),
  );
  const keys: string[] = [];

  for (const target of targets) {
    const sources = Array.from(
      new Set(sourceCurrencies.map((currency) => normalizeCurrencyCode(currency, target))),
    );
    for (const source of sources) {
      if (source !== target) keys.push(currencyRateKey(source, target));
    }
  }

  return Array.from(new Set(keys));
}
