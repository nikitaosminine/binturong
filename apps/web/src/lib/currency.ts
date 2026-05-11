export const DEFAULT_PORTFOLIO_CURRENCY = "EUR";

export const CURRENCY_OPTIONS = [
  { code: "EUR", label: "EUR - Euro" },
  { code: "USD", label: "USD - US dollar" },
  { code: "GBP", label: "GBP - British pound" },
  { code: "CHF", label: "CHF - Swiss franc" },
  { code: "JPY", label: "JPY - Japanese yen" },
  { code: "CAD", label: "CAD - Canadian dollar" },
  { code: "AUD", label: "AUD - Australian dollar" },
  { code: "SEK", label: "SEK - Swedish krona" },
  { code: "NOK", label: "NOK - Norwegian krone" },
  { code: "DKK", label: "DKK - Danish krone" },
] as const;

export function normalizeCurrencyCode(value: unknown, fallback = DEFAULT_PORTFOLIO_CURRENCY) {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

export function formatCurrency(value: number, currency: string, options: Intl.NumberFormatOptions = {}) {
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === "number" ? options.maximumFractionDigits : undefined;
  const minimumFractionDigits =
    typeof options.minimumFractionDigits === "number"
      ? options.minimumFractionDigits
      : maximumFractionDigits != null
        ? Math.min(2, maximumFractionDigits)
        : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizeCurrencyCode(currency),
    ...options,
    minimumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatSignedCurrency(value: number, currency: string) {
  if (value === 0) return formatCurrency(0, currency);
  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(value), currency)}`;
}

export function currencyRateKey(from: string, to: string) {
  return `${normalizeCurrencyCode(from)}:${normalizeCurrencyCode(to)}`;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string | null | undefined,
  toCurrency: string,
  rates: Record<string, number>,
) {
  const from = normalizeCurrencyCode(fromCurrency, toCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return amount;
  const rate = rates[currencyRateKey(from, to)];
  return Number.isFinite(rate) && rate > 0 ? amount * rate : amount;
}

export async function fetchFxRates(
  apiBaseUrl: string,
  sourceCurrencies: Array<string | null | undefined>,
  targetCurrency: string,
) {
  const target = normalizeCurrencyCode(targetCurrency);
  const uniqueSources = Array.from(
    new Set(sourceCurrencies.map((currency) => normalizeCurrencyCode(currency, target))),
  ).filter((currency) => currency !== target);

  if (uniqueSources.length === 0) return {};

  const directSymbols = uniqueSources.map((currency) => `${currency}${target}=X`);
  const directRates = await fetchQuoteRates(apiBaseUrl, directSymbols);
  const rates: Record<string, number> = {};
  const missing: string[] = [];

  for (const source of uniqueSources) {
    const direct = directRates[`${source}${target}=X`];
    if (Number.isFinite(direct) && direct > 0) rates[currencyRateKey(source, target)] = direct;
    else missing.push(source);
  }

  if (missing.length > 0) {
    const inverseSymbols = missing.map((currency) => `${target}${currency}=X`);
    const inverseRates = await fetchQuoteRates(apiBaseUrl, inverseSymbols);
    for (const source of missing) {
      const inverse = inverseRates[`${target}${source}=X`];
      if (Number.isFinite(inverse) && inverse > 0) {
        rates[currencyRateKey(source, target)] = 1 / inverse;
      }
    }
  }

  return rates;
}

async function fetchQuoteRates(apiBaseUrl: string, symbols: string[]) {
  if (symbols.length === 0) return {};
  const response = await fetch(
    `${apiBaseUrl}/api/market/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
  );
  if (!response.ok) return {};
  const quotes = (await response.json()) as Array<{ ticker: string; currentPrice: number | null }>;
  return quotes.reduce<Record<string, number>>((acc, quote) => {
    if (quote.currentPrice != null && Number.isFinite(quote.currentPrice)) {
      acc[quote.ticker.toUpperCase()] = quote.currentPrice;
    }
    return acc;
  }, {});
}
