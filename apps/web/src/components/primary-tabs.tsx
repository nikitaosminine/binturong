"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotebookText, Wallet } from "lucide-react";
import type { ReactNode } from "react";

type Tab = {
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
  href: (pathname: string) => string;
};

const TABS: Tab[] = [
  {
    label: "Portfolio",
    icon: <Wallet className="h-4 w-4" />,
    match: (p) => p.startsWith("/portfolios"),
    href: (p) => {
      if (p.startsWith("/portfolios/")) return p;
      const saved = typeof window !== "undefined" ? localStorage.getItem("binturong.last-portfolio-id") : null;
      return saved ? `/portfolios/${saved}` : "/portfolios";
    },
  },
  {
    label: "The Take",
    icon: <NotebookText className="h-4 w-4" />,
    match: (p) => p.startsWith("/the-take"),
    href: () => "/the-take",
  },
];

export function PrimaryTabs() {
  const pathname = usePathname();

  return (
    <div className="h-14 border-b border-hairline">
      <nav className="mx-auto flex h-full max-w-[1500px] items-center gap-1 pl-14 pr-6">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.label}
              href={t.href(pathname)}
              className={`relative flex h-full items-center gap-2 px-3 text-sm font-medium transition-colors ${
                active ? "text-foreground" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <span className={active ? "text-foreground" : "text-foreground-muted"}>{t.icon}</span>
              {t.label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
