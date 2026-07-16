"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppointments } from "@/hooks/use-health";

export function HealthPageClient() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const filter = useMemo(() => {
    if (!from && !to) return undefined;
    return {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
  }, [from, to]);

  const { data, isLoading } = useAppointments(filter);

  const grouped = useMemo(() => {
    if (!data) return [];
    type Appointment = (typeof data)[number];
    const map = new Map<string, Appointment[]>();
    for (const apt of data) {
      const key = format(apt.date, "MMMM yyyy");
      const existing = map.get(key);
      if (existing) {
        existing.push(apt);
      } else {
        map.set(key, [apt]);
      }
    }
    return Array.from(map.entries()).map(([month, items]) => ({ month, items }));
  }, [data]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Health</h2>
          <p className="text-muted-foreground text-sm">
            Doctor appointments, medications, and records.
          </p>
        </div>
        <Button asChild>
          <Link href="/health/new">
            <Plus className="size-4" /> New appointment
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label className="text-muted-foreground text-xs">From</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-muted-foreground text-xs">To</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </div>
        {(from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date();
            setFrom(format(startOfMonth(now), "yyyy-MM-dd"));
            setTo(format(endOfMonth(now), "yyyy-MM-dd"));
          }}
        >
          This month
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Stethoscope className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">No appointments yet</p>
            <p className="text-muted-foreground text-sm">
              Log your first doctor visit to get started.
            </p>
            <Button asChild className="mt-2">
              <Link href="/health/new">New appointment</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ month, items }) => (
            <div key={month} className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {month}
              </h3>
              <div className="grid gap-2">
                {items.map((apt) => (
                  <Link key={apt.id} href={`/health/${apt.id}`}>
                    <Card className="hover:bg-accent/40 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <CardTitle className="text-base font-medium">
                            {apt.specialty}
                            {apt.doctorName && (
                              <span className="text-muted-foreground ml-2 text-sm font-normal">
                                · {apt.doctorName}
                              </span>
                            )}
                          </CardTitle>
                          <span className="text-muted-foreground text-xs">
                            {format(apt.date, "MMM d, yyyy")}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="text-muted-foreground flex flex-wrap gap-3 pt-0 text-xs">
                        {apt.cost != null && (
                          <span>${Number(apt.cost).toFixed(2)}</span>
                        )}
                        {apt.medications.length > 0 && (
                          <span>
                            {apt.medications.length} medication
                            {apt.medications.length === 1 ? "" : "s"}
                          </span>
                        )}
                        {apt.attachments.length > 0 && (
                          <span>
                            {apt.attachments.length} file
                            {apt.attachments.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
