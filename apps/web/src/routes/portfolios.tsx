import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CreateCsvModal } from "@/components/create-csv-modal";
import { CreateManualModal } from "@/components/create-manual-modal";
import { toast } from "sonner";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvOpen, setCsvOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const fetchPortfolios = async () => {
    const { data, error } = await supabase
      .from("portfolios")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load portfolios");
    } else {
      setPortfolios(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const onCreated = () => {
    setCsvOpen(false);
    setManualOpen(false);
    fetchPortfolios();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your investments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setManualOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create manually
          </Button>
        </div>
      </div>

      {portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BarChart3Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No portfolios yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create your first portfolio by importing a CSV file or adding holdings manually.
          </p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setCsvOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Create from CSV
            </Button>
            <Button onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((p) => (
            <Link key={p.id} to={`/portfolios/${p.id}`}>
              <Card className="group cursor-pointer border-border/50 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {p.description && (
                    <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateCsvModal open={csvOpen} onOpenChange={setCsvOpen} onCreated={onCreated} />
      <CreateManualModal open={manualOpen} onOpenChange={setManualOpen} onCreated={onCreated} />
    </div>
  );
}

function BarChart3Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
    </svg>
  );
}
