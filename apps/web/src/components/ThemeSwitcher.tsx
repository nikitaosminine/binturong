import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";

type ThemeId = "default" | "nordic" | "botanic" | "sunset";

const THEMES: { id: ThemeId; label: string; swatch: string[] }[] = [
  {
    id: "default",
    label: "Midnight Teal",
    swatch: ["oklch(0.16 0.012 240)", "oklch(0.82 0.14 180)", "oklch(0.78 0.15 165)"],
  },
  {
    id: "nordic",
    label: "Nordic Frost",
    swatch: ["oklch(0.15 0.02 240)", "oklch(0.78 0.13 235)", "oklch(0.78 0.1 200)"],
  },
  {
    id: "botanic",
    label: "Botanic Forest",
    swatch: ["oklch(0.18 0.025 155)", "oklch(0.78 0.12 155)", "oklch(0.78 0.13 85)"],
  },
  {
    id: "sunset",
    label: "Sunset Quartz",
    swatch: ["oklch(0.18 0.012 40)", "oklch(0.78 0.14 35)", "oklch(0.8 0.14 85)"],
  },
];

const STORAGE_KEY = "portfolio-theme";
const THEME_CLASSES = ["theme-nordic", "theme-botanic", "theme-sunset"];

function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  THEME_CLASSES.forEach((c) => root.classList.remove(c));
  if (id !== "default") root.classList.add(`theme-${id}`);
}

export function ThemeSwitcher() {
  const [active, setActive] = useState<ThemeId>("default");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeId | null) ?? "default";
    setActive(saved);
    applyTheme(saved);
  }, []);

  const handleSelect = (id: ThemeId) => {
    setActive(id);
    applyTheme(id);
    localStorage.setItem(STORAGE_KEY, id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        aria-label="Change theme"
        aria-expanded={open}
      >
        <Palette className="h-4 w-4 shrink-0" />
        <span className="truncate">Theme</span>
        <span className="ml-auto flex gap-0.5">
          {THEMES.find((t) => t.id === active)?.swatch.map((c, i) => (
            <span key={i} className="h-3 w-1.5 rounded-sm" style={{ background: c }} />
          ))}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute bottom-full left-0 z-50 mb-1 w-56 overflow-hidden rounded-xl border border-hairline bg-surface-elevated shadow-2xl">
            <div className="border-b border-hairline px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-foreground-muted">
              Color palette
            </div>
            <ul>
              {THEMES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(t.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex gap-0.5">
                        {t.swatch.map((c, i) => (
                          <span key={i} className="h-5 w-2 rounded-sm" style={{ background: c }} />
                        ))}
                      </span>
                      <span>{t.label}</span>
                    </span>
                    {active === t.id && <Check className="h-4 w-4 text-accent-teal" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
