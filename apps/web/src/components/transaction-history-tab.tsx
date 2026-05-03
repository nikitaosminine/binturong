import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? "https://binturong-api.nikita-osminine.workers.dev"
    : "http://localhost:8787");

type Side = "BUY" | "SELL" | "DEP" | "WD" | "DIV" | "FEE";

interface Transaction {
  id: string;
  date: string;
  symbol: string;
  isin: string | null;
  yahoo_ticker: string | null;
  side: Side;
  quantity: number | null;
  net_amount: number | null;
  commission: number;
}

interface Props {
  portfolioId: string;
  onDeleted?: () => void;
}

const SIDE_COLOURS: Record<Side, string> = {
  BUY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SELL: "bg-red-500/10 text-red-400 border-red-500/20",
  DEP: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  WD: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DIV: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  FEE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function formatAmount(value: number | null): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export function TransactionHistoryTab({ portfolioId, onDeleted }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load transactions");
      setTransactions(data.transactions ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load transaction history");
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/portfolios/${portfolioId}/transactions/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: await authHeaders(),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Transaction deleted. Chart rebuild queued.");
      setDeleteTarget(null);
      await fetchTransactions();
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Loading transactions...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm">No transactions imported yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Symbol</TableHead>
              <TableHead className="text-xs">ISIN</TableHead>
              <TableHead className="text-xs">Ticker</TableHead>
              <TableHead className="text-xs">Side</TableHead>
              <TableHead className="text-right text-xs">Qty</TableHead>
              <TableHead className="text-right text-xs">Net Amount</TableHead>
              <TableHead className="text-right text-xs">Commission</TableHead>
              <TableHead className="w-8 text-xs" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} className="group">
                <TableCell className="font-mono text-xs">{transaction.date}</TableCell>
                <TableCell className="max-w-[180px] truncate text-xs" title={transaction.symbol}>
                  {transaction.symbol}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {transaction.isin ?? "-"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {transaction.yahoo_ticker ?? "-"}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${SIDE_COLOURS[transaction.side]}`}
                  >
                    {transaction.side}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {transaction.quantity ?? "-"}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-xs ${(transaction.net_amount ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {formatAmount(transaction.net_amount)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {transaction.commission !== 0 ? formatAmount(transaction.commission) : "-"}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(transaction)}
                    className="rounded p-1 text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                    title="Delete transaction"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove the ${deleteTarget.side} of ${deleteTarget.symbol} on ${deleteTarget.date} and rebuild the chart.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
