"use client";

import Link from "next/link";
import {
  Home,
  Wallet,
  HeartPulse,
  NotebookPen,
  Sparkles,
  BriefcaseBusiness,
  Brain,
  RefreshCw,
  FileUser,
  LayoutDashboard,
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
      { title: "Cycle prediction", url: "/finances/cycle-prediction" },
      { title: "Accounts", url: "/finances/accounts" },
      { title: "Expenses", url: "/finances/expenses" },
      { title: "Income", url: "/finances/incomes" },
      { title: "Transfers", url: "/finances/transfers" },
      { title: "Statements", url: "/finances/statements" },
      { title: "Debt", url: "/finances/debt" },
      { title: "Budget", url: "/finances/budget" },
      { title: "Categories", url: "/finances/categories" },
    ],
  },
  {
    title: "Health",
    url: "/health",
    icon: HeartPulse,
  },
  {
    title: "Career",
    url: "/career",
    icon: BriefcaseBusiness,
    items: [
      { title: "Overview", url: "/career", icon: LayoutDashboard },
      { title: "Knowledge", url: "/career/knowledge", icon: Brain },
      { title: "Cycles", url: "/career/cycles", icon: RefreshCw },
      { title: "Resume", url: "/career/resume", icon: FileUser },
    ],
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
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-600 text-white shadow-sm shadow-rose-500/15">
                  <Sparkles className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-[-0.02em]">Hub</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Personal hub
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Overview" items={navItems.slice(0, 1)} />
        <NavMain label="Money" items={navItems.slice(1, 2)} />
        <NavMain label="Personal" items={navItems.slice(2)} />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t p-3">
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
