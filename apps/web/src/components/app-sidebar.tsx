import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  LogOut,
  PanelsTopLeft,
  Settings,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps {
  activeThesisCount?: number;
}

export function AppSidebar({ activeThesisCount = 0 }: AppSidebarProps) {
  const { state, setOpen, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const [sidebarMode, setSidebarMode] = useState<"expanded" | "collapsed" | "hover">(() => {
    try {
      const saved = localStorage.getItem("binturong.sidebar.mode");
      if (saved === "expanded" || saved === "collapsed" || saved === "hover") return saved;
    } catch {
      // ignore
    }
    return "expanded";
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPortfolios = location.pathname.startsWith("/portfolios");
  const isTheTake = location.pathname.startsWith("/the-take");

  const displayName = user?.user_metadata?.full_name
    || user?.email?.split("@")[0]
    || "User";
  const email = user?.email || "";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    try {
      localStorage.setItem("binturong.sidebar.mode", sidebarMode);
    } catch {
      // ignore
    }

    if (sidebarMode === "expanded") setOpen(true);
    else setOpen(false);
    // setOpen changes identity when open state changes; we only want to react to mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarMode]);

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => {
        if (!isMobile && sidebarMode === "hover") setOpen(true);
      }}
      onMouseLeave={() => {
        if (!isMobile && sidebarMode === "hover") setOpen(false);
      }}
    >
      <SidebarHeader className="p-0 border-b border-border">
        <div className="flex items-center gap-2.5 px-4 h-14">
          <div className="h-7 w-7 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <BarChart3 className="h-3.5 w-3.5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">Binturong</span>
              <span className="text-[10px] text-muted-foreground">Portfolio OS</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest px-2 py-2">Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isPortfolios} tooltip="Portfolios">
                  <Link to="/portfolios">
                    <BarChart3 className="h-4 w-4" />
                    {!collapsed && <span>Portfolios</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isTheTake} tooltip="The Take">
                  <Link to="/the-take" className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {!collapsed && <span>The Take</span>}
                    </span>
                    {!collapsed && activeThesisCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                        {activeThesisCount}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Risk watch">
                  <Link to="/risk-watch" className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      {!collapsed && <span>Risk watch</span>}
                    </span>
                    {!collapsed && (
                      <span className="ml-auto inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                        4
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Settings</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size={collapsed ? "icon" : "sm"} className="w-full justify-start mb-1">
              <PanelsTopLeft className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Sidebar control</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuLabel>Sidebar control</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSidebarMode("expanded")}>
              <span className="mr-2 w-4 text-center">{sidebarMode === "expanded" ? "●" : ""}</span>
              Expanded
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSidebarMode("collapsed")}>
              <span className="mr-2 w-4 text-center">{sidebarMode === "collapsed" ? "●" : ""}</span>
              Collapsed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSidebarMode("hover")}>
              <span className="mr-2 w-4 text-center">{sidebarMode === "hover" ? "●" : ""}</span>
              Expand on hover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full justify-start text-muted-foreground hover:text-foreground mb-1"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>

        {!collapsed && email && (
          <div className="flex items-center gap-2 rounded-md bg-[oklch(1_0_0/3%)] border border-border px-2 py-1.5">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[oklch(0.7_0.18_250)] to-[oklch(0.6_0.2_320)] flex items-center justify-center shrink-0">
              <span className="text-[9px] font-semibold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium truncate">{displayName}</div>
              <div className="text-[10px] text-muted-foreground truncate">{email}</div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
