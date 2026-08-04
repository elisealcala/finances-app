import * as React from "react";
import { cn } from "@/lib/utils";

const widths = {
  narrow: "max-w-3xl",
  medium: "max-w-5xl",
  wide: "max-w-[1480px]",
  full: "max-w-none",
} as const;

function PageShell({
  className,
  width = "wide",
  ...props
}: React.ComponentProps<"div"> & { width?: keyof typeof widths }) {
  return (
    <div
      data-slot="page-shell"
      className={cn("mx-auto w-full min-w-0 space-y-6", widths[width], className)}
      {...props}
    />
  );
}

function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-balance">
          {title}
        </h1>
        {description ? (
          <div className="text-muted-foreground max-w-3xl text-sm leading-6">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

function PageSection({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("space-y-4", className)} {...props} />;
}

export { PageHeader, PageSection, PageShell };
