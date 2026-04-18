import { useState } from "react";
import { X, Plus } from "lucide-react";

type Props = {
  tickers: string[];
  editable?: boolean;
  onChange?: (tickers: string[]) => void;
};

export function TickerChips({ tickers, editable, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const remove = (t: string) => onChange?.(tickers.filter((x) => x !== t));
  const commit = () => {
    const v = draft.trim().toUpperCase();
    if (v && !tickers.includes(v)) onChange?.([...tickers, v]);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tickers.map((t) => (
        <span
          key={t}
          className="group inline-flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-foreground"
        >
          {t}
          {editable && (
            <button
              type="button"
              onClick={() => remove(t)}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {editable &&
        (adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder="TICKER"
            className="w-20 rounded-md border border-border bg-transparent px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-strong hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> add
          </button>
        ))}
    </div>
  );
}
