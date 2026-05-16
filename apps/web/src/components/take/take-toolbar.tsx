import { Search } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
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

const PILL_TRANSITION = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };

export function TakeToolbar({
  tabs,
  selectedFilter,
  onFilterChange,
  search,
  onSearchChange,
}: TakeToolbarProps) {
  const shouldReduceMotion = useReducedMotion();
  const pillTransition = shouldReduceMotion ? { duration: 0 } : PILL_TRANSITION;

  return (
    <div className="space-y-2">
      <div className="flex gap-px rounded-full border border-hairline bg-surface-2 p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className="group relative isolate rounded-full px-2.5 py-0.5 text-[11px] font-medium text-foreground-muted transition-colors hover:text-foreground"
          >
            {selectedFilter === tab.value && (
              <motion.span
                layoutId="take-toolbar-filter-pill"
                className="pointer-events-none absolute inset-0 z-0 rounded-full bg-foreground"
                transition={pillTransition}
              />
            )}
            <span className="relative z-10 block text-transparent">{tab.label}</span>
            <span
              className={`absolute inset-0 z-10 grid place-items-center transition-opacity duration-75 ${
                selectedFilter === tab.value ? "opacity-0" : "opacity-100"
              }`}
            >
              {tab.label}
            </span>
            <span
              className={`absolute inset-0 z-10 grid place-items-center text-background transition-opacity duration-100 ${
                selectedFilter === tab.value ? "delay-100 opacity-100" : "opacity-0"
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div className="relative w-full">
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
