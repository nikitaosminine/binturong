import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_PRICES, generateChartData } from "@/lib/mock-data";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portfolios/$portfolioId")({
  component: PortfolioDetailPage,
});

interface Holding {
  id: string;
  ticker: string;
  name: string;
  isin: string | null;
  quantity: number;
  purchase_price: number;
  fees: number;
  purchase_date: string;
}

function PortfolioDetailPage() {
  const { portfolioId } = Route.useParams();
  const [portfolio, setPortfolio] = useState<{ name: string; description: string | null } | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [period, setPeriod] = useState<"1D" | "1M" | "1Y">("1M");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [pRes, hRes] = await Promise.all([
        supabase.from("portfolios").select("name, description").eq("id", portfolioId).single(),
        supabase.from("holdings").select("*").eq("portfolio_id", portfolioId),
      ]);
      if (pRes.error) toast.error("Failed to load portfolio");
      else setPortfolio(pRes.data);
      if (!hRes.error) setHoldings(hRes.data || []);
      setLoading(false);
    };
    load();
  }, [portfolioId]);

  const chartData = useMemo(() => generateChartData(period), [period]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!portfolio) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Portfolio not found</p>
        <Link to="/portfolios" className="text-primary text-sm hover:underline mt-2 inline-block">Back to portfolios</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/portfolios">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{portfolio.name}</h1>
          {portfolio.description && <p className="text-sm text-muted-foreground">{portfolio.description}</p>}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">Portfolio Value</h2>
          <div className="flex gap-1">
            {(["1D", "1M", "1Y"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                stroke="oklch(0.60 0.02 264)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="oklch(0.60 0.02 264)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                domain={["dataMin - 500", "dataMax + 500"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.18 0.03 264)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                  borderRadius: "8px",
                  color: "oklch(0.96 0.005 264)",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="oklch(0.65 0.19 250)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-lg border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">ISIN</TableHead>
              <TableHead className="text-xs text-right">Qty</TableHead>
              <TableHead className="text-xs text-right">Current Price</TableHead>
              <TableHead className="text-xs text-right">Cost</TableHead>
              <TableHead className="text-xs text-right">Total Value</TableHead>
              <TableHead className="text-xs text-right">Perf 1D</TableHead>
              <TableHead className="text-xs text-right">Perf YTD</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  No holdings in this portfolio
                </TableCell>
              </TableRow>
            ) : (
              holdings.map((h) => {
                const currentPrice = MOCK_PRICES[h.ticker] || h.purchase_price;
                const totalValue = currentPrice * h.quantity;
                const perf1D = ((Math.random() - 0.5) * 4).toFixed(2);
                const perfYTD = (((currentPrice - h.purchase_price) / h.purchase_price) * 100).toFixed(2);

                return (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{h.name}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">{h.ticker}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{h.isin || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{h.quantity}</TableCell>
                    <TableCell className="text-right text-sm">${currentPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm">${h.purchase_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">${totalValue.toFixed(2)}</TableCell>
                    <TableCell className={`text-right text-sm ${parseFloat(perf1D) >= 0 ? "text-positive" : "text-negative"}`}>
                      {parseFloat(perf1D) >= 0 ? "+" : ""}{perf1D}%
                    </TableCell>
                    <TableCell className={`text-right text-sm ${parseFloat(perfYTD) >= 0 ? "text-positive" : "text-negative"}`}>
                      {parseFloat(perfYTD) >= 0 ? "+" : ""}{perfYTD}%
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
