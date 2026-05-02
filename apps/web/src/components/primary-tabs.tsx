import { Link, useLocation } from "react-router-dom";
import { NotebookText, Wallet } from "lucide-react";
import type { ReactNode } from "react";

type Tab = {
  to: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    to: "/portfolios",
    label: "Portfolio",
    icon: <Wallet className="h-4 w-4" />,
    match: (p) => p.startsWith("/portfolios"),
  },
  {
    to: "/the-take",
    label: "The Take",
    icon: <NotebookText className="h-4 w-4" />,
    match: (p) => p.startsWith("/the-take"),
  },
];

export function PrimaryTabs() {
  const { pathname } = useLocation();

  return (
    <div className="border-b border-hairline">
      <nav className="mx-auto flex max-w-[1500px] items-center gap-1 px-6">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
                active ? "text-foreground" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <span className={active ? "text-accent-teal" : "text-foreground-muted"}>
                {t.icon}
              </span>
              {t.label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-teal" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
