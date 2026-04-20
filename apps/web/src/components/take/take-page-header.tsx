import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TakePageHeaderProps {
  onNewTake: () => void;
}

export function TakePageHeader({ onNewTake }: TakePageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight">The Take</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your investment theses and conviction log
        </p>
      </div>
      <Button size="sm" onClick={onNewTake}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        New take
      </Button>
    </div>
  );
}
