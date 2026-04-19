import { useState, useRef, useEffect } from "react";
import { Thesis } from "@/lib/thesis";

interface TakeBadgeProps {
  theses: Thesis[];
  onOpen: (id: string) => void;
  onCreate?: () => void;
}

export function TakeBadge({ theses, onOpen, onCreate }: TakeBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (theses.length === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCreate?.();
        }}
        className="inline-flex items-center justify-center h-5 w-5 rounded border border-dashed border-border/60 text-muted-foreground/70 text-xs hover:text-foreground hover:border-border transition-colors"
        aria-label="Create new take"
      >
        +
      </button>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
      >
        {theses.length}
      </button>
      {open && (
        <div className="absolute z-50 top-7 right-0 w-64 rounded-lg border border-border/50 bg-card shadow-lg p-1.5 space-y-0.5">
          {theses.map((t) => (
            <button
              key={t.id}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onOpen(t.id); }}
              className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-foreground line-clamp-1">{t.title}</span>
              <span className="text-muted-foreground ml-1.5">{t.tickers.join(", ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
