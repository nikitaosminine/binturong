import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThesisStatus } from "@/lib/thesis";

export type FilterTab = "all" | ThesisStatus;

interface FilterTabConfig {
  value: FilterTab;
  label: string;
}

interface TakeToolbarProps {
  tabs: FilterTabConfig[];
  selectedFilter: FilterTab;
  onFilterChange: (value: FilterTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function TakeToolbar({
  tabs,
  selectedFilter,
  onFilterChange,
  search,
  onSearchChange,
}: TakeToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 overflow-x-auto gap-1 bg-muted/40 rounded-lg p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedFilter === tab.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative min-w-[220px] max-w-xs w-full">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search theses…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
    </div>
  );
}
