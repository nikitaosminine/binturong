import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PortfolioLike {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio: PortfolioLike | null;
  onSaved: () => void;
}

export function EditPortfolioModal({ open, onOpenChange, portfolio, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !portfolio) return;
    setName(portfolio.name);
    setDescription(portfolio.description ?? "");
  }, [open, portfolio]);

  const handleSubmit = async () => {
    if (!portfolio || !name.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from("portfolios")
      .update({
        name: name.trim(),
        description: description.trim() || null,
      })
      .eq("id", portfolio.id);

    if (error) {
      toast.error("Failed to update portfolio");
      setLoading(false);
      return;
    }

    toast.success("Portfolio updated");
    setLoading(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit portfolio</DialogTitle>
          <DialogDescription>Update portfolio details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Portfolio name *</Label>
              <Input placeholder="My Portfolio" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!name.trim() || loading} className="w-full">
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
