"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const labels: Record<string, string> = {
  finances: "Finances",
  accounts: "Accounts",
  expenses: "Expenses",
  incomes: "Income",
  transfers: "Transfers",
  statements: "Statements",
  debt: "Debt",
  budget: "Budget",
  categories: "Categories",
  health: "Health",
  career: "Career",
  knowledge: "Knowledge",
  cycles: "Cycles",
  resume: "Resume",
  notes: "Notes",
  new: "New",
};

function labelFor(segment: string, index: number, segments: string[]) {
  if (labels[segment]) return labels[segment];
  if (index > 0 && segments[index - 1] === "debt") return "Details";
  if (
    index > 0 &&
    ["notes", "health", "knowledge", "cycles", "resume"].includes(
      segments[index - 1],
    )
  ) {
    return "Entry";
  }
  return "Details";
}

export function AppHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.length === 0 ? [{ label: "Home", href: "/" }] : segments.map(
    (segment, index) => ({
      label: labelFor(segment, index, segments),
      href: `/${segments.slice(0, index + 1).join("/")}`,
    }),
  );

  return (
    <header className="bg-background/92 sticky top-0 z-30 flex h-14 shrink-0 items-center border-b px-3 backdrop-blur-xl sm:px-5">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-3 h-4" />
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <div key={crumb.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="text-muted-foreground/60 size-3.5 shrink-0" />
              ) : null}
              {current ? (
                <span className="truncate font-medium">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground truncate transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </header>
  );
}
