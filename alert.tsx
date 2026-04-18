import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ChevronUp, Layers } from "lucide-react";
import type { Thesis } from "@/lib/theses";
import { ThesisCard } from "./ThesisCard";

type Props = {
  theses: Thesis[];
  onChange: (next: Thesis[]) => void;
};

const STACK_OFFSET = 14; // px between visible card tops in the stack
const STACK_SCALE_STEP = 0.018;
const STACK_VISIBLE_CARD_HEIGHT = 96; // approx collapsed card height (header only)

export function ThesisStack({ theses, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const updateOne = (next: Thesis) =>
    onChange(theses.map((t) => (t.id === next.id ? next : t)));

  const stackHeight =
    STACK_VISIBLE_CARD_HEIGHT + STACK_OFFSET * (theses.length - 1);

  return (
    <LayoutGroup>
      <div className="relative">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Theses
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
              Investment notes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {theses.length} active {theses.length === 1 ? "thesis" : "theses"} ·{" "}
              {expanded ? "expanded" : "click the stack to expand"}
            </p>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.button
                key="collapse"
                type="button"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Collapse stack
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Stack vs. expanded list */}
        {!expanded ? (
          <motion.button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand thesis stack"
            className="group relative block w-full text-left focus:outline-none"
            style={{ height: stackHeight }}
            whileHover="hover"
          >
            {theses.map((t, i) => {
              const depth = theses.length - 1 - i; // top card has depth 0
              return (
                <motion.div
                  key={t.id}
                  layoutId={`thesis-${t.id}`}
                  className="absolute inset-x-0 origin-top"
                  style={{
                    top: i * STACK_OFFSET,
                    zIndex: i,
                    scale: 1 - depth * STACK_SCALE_STEP,
                    transformOrigin: "top center",
                  }}
                  variants={{
                    hover: {
                      y: i === theses.length - 1 ? -3 : 0,
                    },
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                >
                  <ThesisCard
                    thesis={t}
                    expanded={false}
                    onChange={updateOne}
                  />
                </motion.div>
              );
            })}
            {/* Hint glow on hover for the top card */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-8 -bottom-2 h-6 rounded-full bg-primary/0 blur-2xl transition-colors duration-300 group-hover:bg-primary/20"
            />
          </motion.button>
        ) : (
          <div className="flex flex-col gap-4">
            {theses.map((t) => (
              <motion.div key={t.id} layoutId={`thesis-${t.id}`}>
                <ThesisCard thesis={t} expanded onChange={updateOne} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}
