import { motion } from "framer-motion";
import { useState } from "react";
import { Pencil, Check } from "lucide-react";
import type { Thesis } from "@/lib/theses";
import { RichTextEditor } from "./RichTextEditor";
import { TickerChips } from "./TickerChips";

type Props = {
  thesis: Thesis;
  expanded: boolean;
  onChange: (next: Thesis) => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ThesisCard({ thesis, expanded, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  const update = (patch: Partial<Thesis>) =>
    onChange({ ...thesis, ...patch, updatedAt: new Date().toISOString() });

  return (
    <motion.article
      layout
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground"
      style={{ boxShadow: "var(--shadow-card)" }}
      whileHover={expanded ? { y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Top "tape" line — gives the card the index-card silhouette in the stack */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />

      <div className="px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                value={thesis.title}
                onChange={(e) => update({ title: e.target.value })}
                className="w-full bg-transparent text-base font-semibold tracking-tight text-foreground focus:outline-none"
              />
            ) : (
              <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
                {thesis.title}
              </h3>
            )}
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Updated {formatDate(thesis.updatedAt)}</span>
            </div>
          </div>

          {expanded && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {editing ? (
                <>
                  <Check className="h-3 w-3" /> Done
                </>
              ) : (
                <>
                  <Pencil className="h-3 w-3" /> Edit
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-3">
          <TickerChips
            tickers={thesis.tickers}
            editable={editing}
            onChange={(tickers) => update({ tickers })}
          />
        </div>
      </div>

      {/* Body — only mounted when the stack is expanded so collapsed view stays light */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="border-t border-border px-5 pb-5 pt-4"
        >
          <RichTextEditor
            value={thesis.content}
            onChange={(content) => update({ content })}
            editable={editing}
          />
        </motion.div>
      )}
    </motion.article>
  );
}
