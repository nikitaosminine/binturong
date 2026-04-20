import { LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThesisStatus } from "@/lib/thesis";

export type FilterTab = "all" | ThesisStatus;
export type SortBy = "recent" | "conviction" | "signals" | "title";
export type ViewMode = "grid" | "list";

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
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TakeToolbar({
  tabs,
  selectedFilter,
  onFilterChange,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
}: TakeToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedFilter === tab.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search theses…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Sort theses"
          >
            <option value="recent">Most recent</option>
            <option value="conviction">Conviction</option>
            <option value="signals">Signal count</option>
            <option value="title">Title</option>
          </select>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border/50 p-0.5">
          <Button
            size="icon"
            variant={viewMode === "grid" ? "default" : "ghost"}
            className="h-7 w-7"
            onClick={() => onViewModeChange("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "list" ? "default" : "ghost"}
            className="h-7 w-7"
            onClick={() => onViewModeChange("list")}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
