import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThesisCenteredModal } from "@/components/thesis-centered-modal";
import { useAuth } from "@/hooks/use-auth";
import { useTheses } from "@/hooks/use-theses";
import { Thesis } from "@/lib/thesis";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

function Topbar() {
  const location = useLocation();
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  useEffect(() => {
    document.body.dataset.density = density;
  }, [density]);

  const segments = location.pathname.split("/").filter(Boolean);
  const breadcrumb = segments.length > 0
    ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, " ")
    : "Home";

  return (
    <header className="h-14 flex items-center justify-between gap-3 border-b border-border px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-8 w-8" />
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Binturong</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-medium">{breadcrumb}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 rounded-md border border-border bg-[oklch(1_0_0/2%)] px-2 h-8 w-56">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            placeholder="Search…"
            className="bg-transparent text-xs outline-none w-full placeholder:text-muted-foreground"
            readOnly
          />
          <span className="mono text-[10px] text-muted-foreground px-1 py-0.5 rounded bg-[oklch(1_0_0/5%)] border border-border shrink-0">
            ⌘K
          </span>
        </div>

        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {(["comfortable", "compact"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={`px-2 h-8 text-[11px] transition-colors ${
                density === d
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              }`}
            >
              {d === "comfortable" ? "Cozy" : "Compact"}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Ask Binturong
        </Button>
      </div>
    </header>
  );
}

export default function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theses, addThesis, updateThesis, deleteThesis } = useTheses();
  const [selectedThesisId, setSelectedThesisId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const openDrawer = (id: string) => setSelectedThesisId(id);
  const openModal = (thesis?: Thesis) => {
    if (thesis) setSelectedThesisId(thesis.id);
    else setCreateOpen(true);
  };

  const selectedThesis = selectedThesisId ? theses.find((t) => t.id === selectedThesisId) ?? null : null;
  const activeCount = theses.filter((t) => t.status === "active" || t.status === "playing-out").length;
  const context = { theses, addThesis, updateThesis, deleteThesis, openDrawer, openModal };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeThesisCount={activeCount} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-6 overflow-auto">
            <Outlet context={context} />
          </main>
        </div>
      </div>
      <ThesisCenteredModal
        open={!!selectedThesisId || createOpen}
        onOpenChange={(o) => {
          if (!o) { setSelectedThesisId(null); setCreateOpen(false); }
        }}
        thesis={selectedThesis}
        onSave={(data) => {
          if (selectedThesisId) updateThesis(selectedThesisId, data);
          else addThesis(data);
          setSelectedThesisId(null);
          setCreateOpen(false);
        }}
        onDelete={(id) => { deleteThesis(id); setSelectedThesisId(null); }}
      />
    </SidebarProvider>
  );
}
