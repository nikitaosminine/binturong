import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThesisDrawer } from "@/components/thesis-drawer";
import { ThesisModal } from "@/components/thesis-modal";
import { useAuth } from "@/hooks/use-auth";
import { useTheses } from "@/hooks/use-theses";
import { Thesis } from "@/lib/thesis";

export default function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theses, addThesis, updateThesis, deleteThesis } = useTheses();
  const [drawerThesisId, setDrawerThesisId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingThesis, setEditingThesis] = useState<Thesis | null>(null);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const drawerThesis = drawerThesisId ? theses.find((t) => t.id === drawerThesisId) ?? null : null;

  const openDrawer = (id: string) => setDrawerThesisId(id);
  const openModal = (thesis?: Thesis) => {
    setEditingThesis(thesis ?? null);
    setModalOpen(true);
  };

  const handleSave = (data: Omit<Thesis, "id" | "createdAt">) => {
    if (editingThesis) {
      updateThesis(editingThesis.id, data);
    } else {
      addThesis(data);
    }
  };

  const activeCount = theses.filter((t) => t.status === "active" || t.status === "playing-out").length;

  const context = { theses, addThesis, updateThesis, deleteThesis, openDrawer, openModal };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeThesisCount={activeCount} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/50 px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6">
            <Outlet context={context} />
          </main>
        </div>
      </div>
      <ThesisDrawer
        thesis={drawerThesis}
        onClose={() => setDrawerThesisId(null)}
        onEdit={(t) => { setDrawerThesisId(null); openModal(t); }}
        onDelete={deleteThesis}
      />
      <ThesisModal
        open={modalOpen}
        initial={editingThesis}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditingThesis(null); }}
      />
    </SidebarProvider>
  );
}
