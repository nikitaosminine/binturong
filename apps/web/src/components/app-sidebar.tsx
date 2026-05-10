import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, LogOut, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { NodeLogo } from "@/components/node-logo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { supabase } from "@/integrations/supabase/client";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ to: "/portfolios", label: "Portfolio", icon: <BarChart3 className="h-4 w-4" /> }],
  },
  {
    label: "Settings",
    items: [{ to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> }],
  },
];

export function AppSidebar({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (to: string) =>
    to === "/portfolios"
      ? pathname.startsWith("/portfolios") || pathname.startsWith("/the-take")
      : pathname.startsWith(to);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-hairline bg-surface transition-all duration-200 ${
          collapsed ? "w-[68px]" : "w-[232px]"
        }`}
      >
        {/* Logo */}
        <div
          className={`relative flex h-14 items-center border-b border-hairline ${
            collapsed ? "justify-center px-2" : "justify-start px-3"
          }`}
        >
          <Link
            to="/portfolios"
            aria-label="Node home"
            className={`flex min-w-0 items-center ${
              collapsed
                ? "absolute left-1/2 h-10 w-10 -translate-x-1/2 justify-center overflow-hidden"
                : "gap-2 overflow-hidden"
            }`}
          >
            <NodeLogo className={collapsed ? "h-9 w-9" : "h-8 w-8"} />
            {!collapsed && (
              <span className="truncate text-base font-semibold tracking-tight">Node</span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {GROUPS.map((group, gi) => {
            const showSeparator = collapsed && gi > 0;
            return (
              <div key={gi} className="mb-2">
                {showSeparator && <div className="mx-2 my-2 border-t border-hairline" />}
                {!collapsed && group.label && (
                  <div className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                    {group.label}
                  </div>
                )}
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          title={collapsed ? item.label : undefined}
                          className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-foreground/10 text-foreground"
                              : "text-foreground-muted hover:bg-surface-2 hover:text-foreground"
                          } ${collapsed ? "justify-center" : ""}`}
                        >
                          <span className="grid h-5 w-5 shrink-0 place-items-center">
                            {item.icon}
                          </span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={`flex flex-col gap-1 border-t border-hairline p-2 ${collapsed ? "items-center" : ""}`}
        >
          <ThemeSwitcher compact={collapsed} />
          <button
            type="button"
            onClick={handleSignOut}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute left-3 top-3 z-30 grid h-8 w-8 place-items-center rounded-md border border-transparent text-foreground-muted transition-colors hover:border-hairline hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          )}
        </button>
        {children}
      </main>
    </div>
  );
}
