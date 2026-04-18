export const MOCK_STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", isin: "US0378331005" },
  { ticker: "MSFT", name: "Microsoft Corporation", isin: "US5949181045" },
  { ticker: "GOOGL", name: "Alphabet Inc.", isin: "US02079K3059" },
  { ticker: "AMZN", name: "Amazon.com Inc.", isin: "US0231351067" },
  { ticker: "NVDA", name: "NVIDIA Corporation", isin: "US67066G1040" },
  { ticker: "TSLA", name: "Tesla Inc.", isin: "US88160R1014" },
  { ticker: "META", name: "Meta Platforms Inc.", isin: "US30303M1027" },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", isin: "US46625H1005" },
  { ticker: "V", name: "Visa Inc.", isin: "US92826C8394" },
  { ticker: "JNJ", name: "Johnson & Johnson", isin: "US4781601046" },
  { ticker: "WMT", name: "Walmart Inc.", isin: "US9311421039" },
  { ticker: "UNH", name: "UnitedHealth Group", isin: "US91324P1021" },
];

export const MOCK_PRICES: Record<string, number> = {
  AAPL: 198.50, MSFT: 415.20, GOOGL: 155.80, AMZN: 186.40,
  NVDA: 875.30, TSLA: 245.60, META: 505.75, JPM: 198.30,
  V: 280.15, JNJ: 158.40, WMT: 172.90, UNH: 525.60,
};

export function generateChartData(period: "1D" | "1M" | "1Y") {
  const now = new Date();
  const points: { date: string; value: number }[] = [];
  let count = 0;
  let baseValue = 10000;

  switch (period) {
    case "1D":
      count = 78; // 6.5 hours of trading, 5-min intervals
      for (let i = 0; i < count; i++) {
        const d = new Date(now);
        d.setHours(9, 30 + i * 5, 0, 0);
        baseValue += (Math.random() - 0.48) * 50;
        points.push({ date: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), value: Math.round(baseValue * 100) / 100 });
      }
      break;
    case "1M":
      count = 22;
      for (let i = count; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        baseValue += (Math.random() - 0.45) * 200;
        points.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: Math.round(baseValue * 100) / 100 });
      }
      break;
    case "1Y":
      count = 52;
      for (let i = count; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        baseValue += (Math.random() - 0.42) * 500;
        points.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: Math.round(baseValue * 100) / 100 });
      }
      break;
  }
  return points;
}

export const CSV_TEMPLATE = `Ticker,Date,Price,Quantity,Fees
AAPL,2024-01-15,185.50,10,4.99
MSFT,2024-02-20,410.00,5,4.99
GOOGL,2024-03-10,148.25,15,4.99`;
