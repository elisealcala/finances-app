"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useAlerts } from "@/hooks/use-alerts";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: "bg-destructive/6",
    border: "border-destructive/18",
    text: "text-foreground",
    iconColor: "text-destructive",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-warning/7",
    border: "border-warning/20",
    text: "text-foreground",
    iconColor: "text-warning",
  },
  info: {
    icon: Info,
    bg: "bg-info/7",
    border: "border-info/20",
    text: "text-foreground",
    iconColor: "text-info",
  },
};

export function AlertBanner() {
  const { data: alerts } = useAlerts();

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              config.bg,
              config.border,
            )}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconColor)} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", config.text)}>
                {alert.title}
              </p>
              <p className={cn("text-xs", config.text, "opacity-80")}>
                {alert.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
