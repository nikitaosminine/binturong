export const MOCK_STOCKS = [
  { ticker: "AAPL",  name: "Apple Inc.",              isin: "US0378331005", sector: "Technology" },
  { ticker: "MSFT",  name: "Microsoft Corporation",   isin: "US5949181045", sector: "Technology" },
  { ticker: "GOOGL", name: "Alphabet Inc.",            isin: "US02079K3059", sector: "Technology" },
  { ticker: "AMZN",  name: "Amazon.com Inc.",          isin: "US0231351067", sector: "Consumer Discretionary" },
  { ticker: "NVDA",  name: "NVIDIA Corporation",       isin: "US67066G1040", sector: "Technology" },
  { ticker: "TSLA",  name: "Tesla Inc.",               isin: "US88160R1014", sector: "Consumer Discretionary" },
  { ticker: "META",  name: "Meta Platforms Inc.",      isin: "US30303M1027", sector: "Technology" },
  { ticker: "JPM",   name: "JPMorgan Chase & Co.",     isin: "US46625H1005", sector: "Financials" },
  { ticker: "V",     name: "Visa Inc.",                isin: "US92826C8394", sector: "Financials" },
  { ticker: "JNJ",   name: "Johnson & Johnson",        isin: "US4781601046", sector: "Healthcare" },
  { ticker: "WMT",   name: "Walmart Inc.",             isin: "US9311421039", sector: "Consumer Staples" },
  { ticker: "UNH",   name: "UnitedHealth Group",       isin: "US91324P1021", sector: "Healthcare" },
  { ticker: "BRK.B", name: "Berkshire Hathaway B",    isin: "US0846707026", sector: "Financials" },
  { ticker: "XOM",   name: "Exxon Mobil Corporation", isin: "US30231G1022", sector: "Energy" },
  { ticker: "PG",    name: "Procter & Gamble Co.",    isin: "US7427181091", sector: "Consumer Staples" },
];

export const MOCK_PRICES: Record<string, number> = {
  AAPL:  198.50, MSFT:  415.20, GOOGL: 155.80, AMZN:  186.40,
  NVDA:  875.30, TSLA:  245.60, META:  505.75, JPM:   198.30,
  V:     280.15, JNJ:   158.40, WMT:   172.90, UNH:   525.60,
  "BRK.B": 415.10, XOM: 118.40, PG: 165.20,
};

export function getSector(ticker: string): string {
  return MOCK_STOCKS.find((s) => s.ticker === ticker)?.sector ?? "Other";
}

// Deterministic 1D performance — does not re-randomize on each render
export function get1DPerf(ticker: string, quantity: number): number {
  const seed = ticker.charCodeAt(0) * 7 + (ticker.charCodeAt(1) || 3) + quantity;
  return parseFloat((Math.sin(seed) * 2.2).toFixed(2));
}

// Seeded chart generator — each portfolio/seed gets a unique but consistent series
export function generateChartData(period: string, seed = 0) {
  const now = new Date();
  const points: { date: string; value: number }[] = [];
  let baseValue = 10000 + seed * 1234.56;

  const deterministicStep = (i: number, amplitude: number) =>
    Math.sin(seed * 0.7 + i * 0.4) * amplitude + Math.cos(seed * 1.1 + i * 0.9) * (amplitude * 0.3);

  let count: number;
  let interval: (i: number) => { d: Date; label: string };

  switch (period) {
    case "1D":
      count = 78;
      interval = (i) => {
        const d = new Date(now);
        d.setHours(9, 30 + i * 5, 0, 0);
        return { d, label: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) };
      };
      for (let i = 0; i < count; i++) {
        baseValue += deterministicStep(i, 60);
        const { label } = interval(i);
        points.push({ date: label, value: Math.max(100, Math.round(baseValue * 100) / 100) });
      }
      break;

    case "1W":
      count = 5;
      for (let i = count; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        baseValue += deterministicStep(i, 300);
        points.push({ date: d.toLocaleDateString("en-US", { weekday: "short" }), value: Math.max(100, Math.round(baseValue * 100) / 100) });
      }
      break;

    case "1M":
    default:
      count = 22;
      for (let i = count; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        baseValue += deterministicStep(i, 250);
        points.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: Math.max(100, Math.round(baseValue * 100) / 100) });
      }
      break;

    case "1Y":
      count = 52;
      for (let i = count; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        baseValue += deterministicStep(i, 600);
        points.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: Math.max(100, Math.round(baseValue * 100) / 100) });
      }
      break;

    case "ALL":
      count = 260;
      for (let i = count; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        baseValue += deterministicStep(i, 800);
        points.push({ date: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), value: Math.max(100, Math.round(baseValue * 100) / 100) });
      }
      break;
  }

  return points;
}

export const CSV_TEMPLATE = `Ticker,Exchange,ISIN,Date,Price,Quantity,Fees
AAPL,NMS,US0378331005,2024-01-15,185.50,10,4.99
MSFT,NMS,US5949181045,2024-02-20,410.00,5,4.99
GOOGL,NMS,US02079K3059,2024-03-10,148.25,15,4.99`;
