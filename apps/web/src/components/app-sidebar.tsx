import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, ChevronLeft, LogOut, Settings } from "lucide-react";
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
    items: [
      { to: "/portfolios", label: "Portfolio", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ],
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
        <div className="flex h-14 items-center justify-between border-b border-hairline px-3">
          <Link to="/portfolios" className="flex items-center gap-2 overflow-hidden">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-teal/15 text-accent-teal">
              <BarChart3 className="h-4 w-4" />
            </div>
            {!collapsed && (
              <span className="truncate text-sm font-semibold tracking-tight">Binturong</span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            style={{ marginLeft: collapsed ? "-4px" : "0" }}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
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
                              ? "bg-accent-teal/12 text-foreground"
                              : "text-foreground-muted hover:bg-surface-2 hover:text-foreground"
                          } ${collapsed ? "justify-center" : ""}`}
                        >
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center ${
                              active ? "text-accent-teal" : ""
                            }`}
                          >
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
          {!collapsed && <ThemeSwitcher />}
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
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
