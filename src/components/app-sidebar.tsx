"use client";

import {
  Home,
  Wallet,
  HeartPulse,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Finances",
    url: "/finances",
    icon: Wallet,
    items: [
      { title: "Overview", url: "/finances" },
      { title: "Accounts", url: "/finances/accounts" },
      { title: "Expenses", url: "/finances/expenses" },
      { title: "Income", url: "/finances/incomes" },
      { title: "Transfers", url: "/finances/transfers" },
      { title: "Statements", url: "/finances/statements" },
      { title: "Debt", url: "/finances/debt" },
      { title: "Budget", url: "/finances/budget" },
      { title: "Categories", url: "/finances/categories" },
      { title: "Predictions", url: "/finances/predictions" },
      { title: "Recurring", url: "/finances/recurring" },
      { title: "Imports", url: "/finances/imports" },
    ],
  },
  {
    title: "Health",
    url: "/health",
    icon: HeartPulse,
  },
  {
    title: "Notes",
    url: "/notes",
    icon: NotebookPen,
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                  <Sparkles className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Hub</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Personal hub
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Menu" items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
