"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          tooltip="Appearance"
        >
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
          <span>Appearance</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
