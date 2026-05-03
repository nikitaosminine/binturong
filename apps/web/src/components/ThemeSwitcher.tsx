import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "binturong-theme-mode";
const LEGACY_STORAGE_KEY = "portfolio-theme";
const LEGACY_THEME_CLASSES = [
  "theme-nordic",
  "theme-botanic",
  "theme-cobalt",
  "theme-aurora",
  "theme-sunset",
];

function getStoredMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "dark" || saved === "light" ? saved : "light";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  LEGACY_THEME_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.toggle("dark", mode === "dark");
}

export function ThemeInitializer() {
  useEffect(() => {
    applyTheme(getStoredMode());
  }, []);

  return null;
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const saved = getStoredMode();
    setMode(saved);
    applyTheme(saved);
  }, []);

  const handleToggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const isDark = mode === "dark";
  const Icon = isDark ? Moon : Sun;
  const label = isDark ? "Dark mode" : "Light mode";
  const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center rounded-lg text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground ${
        compact ? "h-9 w-9 justify-center" : "w-full gap-2 px-2.5 py-2"
      }`}
      aria-label={nextLabel}
      title={compact ? nextLabel : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!compact && (
        <>
          <span className="truncate">{label}</span>
          <span
            className={`ml-auto flex h-5 w-9 items-center rounded-full border border-hairline px-0.5 transition-colors ${
              isDark ? "justify-end bg-foreground/15" : "justify-start bg-surface-elevated"
            }`}
            aria-hidden
          >
            <span className="h-3.5 w-3.5 rounded-full bg-foreground shadow-sm" />
          </span>
        </>
      )}
    </button>
  );
}
