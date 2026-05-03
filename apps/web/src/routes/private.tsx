import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { ThesisCenteredModal } from "@/components/thesis-centered-modal";
import { useAuth } from "@/hooks/use-auth";
import { useTheses } from "@/hooks/use-theses";
import { Thesis } from "@/lib/thesis";

export default function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theses, addThesis, updateThesis, deleteThesis } = useTheses();
  const [selectedThesisId, setSelectedThesisId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<
    Partial<Pick<Thesis, "title" | "summary" | "tickers" | "horizon" | "tags">> | null
  >(null);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const openDrawer = (id: string) => setSelectedThesisId(id);
  const openModal = (
    thesis?: Thesis,
    prefill?: Partial<Pick<Thesis, "title" | "summary" | "tickers" | "horizon" | "tags">>,
  ) => {
    if (thesis) {
      setSelectedThesisId(thesis.id);
      return;
    }
    setCreatePrefill(prefill ?? null);
    setCreateOpen(true);
  };

  const selectedThesis = selectedThesisId
    ? theses.find((t) => t.id === selectedThesisId) ?? null
    : null;
  const context = { theses, addThesis, updateThesis, deleteThesis, openDrawer, openModal };

  return (
    <>
      <AppSidebar>
        <div className="flex min-h-screen flex-col">
          <Outlet context={context} />
        </div>
      </AppSidebar>
      <ThesisCenteredModal
        open={!!selectedThesisId || createOpen}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedThesisId(null);
            setCreateOpen(false);
            setCreatePrefill(null);
          }
        }}
        thesis={selectedThesis}
        createPrefill={createPrefill}
        onSave={(data) => {
          if (selectedThesisId) updateThesis(selectedThesisId, data);
          else addThesis(data);
          setSelectedThesisId(null);
          setCreateOpen(false);
          setCreatePrefill(null);
        }}
        onDelete={(id) => {
          deleteThesis(id);
          setSelectedThesisId(null);
          setCreatePrefill(null);
        }}
      />
    </>
  );
}
