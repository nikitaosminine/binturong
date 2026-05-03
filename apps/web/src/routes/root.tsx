import { Outlet } from "react-router-dom";
import { ThemeInitializer } from "@/components/ThemeSwitcher";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout() {
  return (
    <>
      <ThemeInitializer />
      <Outlet />
      <Toaster />
    </>
  );
}
