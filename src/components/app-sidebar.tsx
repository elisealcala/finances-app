"use client";

import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Target,
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
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Debt",
    url: "/dashboard/debt",
    icon: CreditCard,
  },
  {
    title: "Finances",
    url: "/dashboard/finances",
    icon: Wallet,
    items: [
      { title: "Overview", url: "/dashboard/finances" },
      { title: "Accounts", url: "/dashboard/finances/accounts" },
      { title: "Expenses", url: "/dashboard/finances/expenses" },
      { title: "Income", url: "/dashboard/finances/incomes" },
      { title: "Transfers", url: "/dashboard/finances/transfers" },
      { title: "Budget", url: "/dashboard/finances/budget" },
      { title: "Predictions", url: "/dashboard/finances/predictions" },
      { title: "Recurring", url: "/dashboard/finances/recurring" },
    ],
  },
  {
    title: "Goals",
    url: "/dashboard/goals",
    icon: Target,
    disabled: true,
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Wallet className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Finances</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Personal finance tracker
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
