"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, subDays } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Mail,
  CircleCheck,
  Clock,
  HelpCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/server/trpc/utils";
import {
  useImportsStatus,
  usePollNow,
  useBackfill,
  useUpdatePollSettings,
  useDisconnectGmail,
} from "@/hooks/use-imports";
import { toast } from "sonner";

type PollEvent = {
  emailMessageId: string;
  from: string | null;
  subject: string | null;
  emailDate: string | null;
  outcome:
    | "IMPORTED_NEW"
    | "ALREADY_PROCESSED"
    | "UNKNOWN_SENDER"
    | "PARSE_FAILED"
    | "FETCH_ERROR";
  detail: string | null;
};

type LastPollResult = {
  inserted: number;
  alreadyProcessed: number;
  unknownSender: number;
  parseFailed: number;
  fetchError: number;
  total: number;
  query: string;
  events: PollEvent[];
  ranAt: string;
};

const OUTCOME_META: Record<
  PollEvent["outcome"],
  { label: string; icon: typeof CircleCheck; variant: string }
> = {
  IMPORTED_NEW: { label: "Imported", icon: CircleCheck, variant: "text-emerald-600" },
  ALREADY_PROCESSED: { label: "Already processed", icon: Clock, variant: "text-muted-foreground" },
  UNKNOWN_SENDER: { label: "Unknown sender", icon: HelpCircle, variant: "text-amber-600" },
  PARSE_FAILED: { label: "Parse failed", icon: XCircle, variant: "text-destructive" },
  FETCH_ERROR: { label: "Fetch error", icon: AlertTriangle, variant: "text-destructive" },
};

export function ImportsSettingsClient() {
  const params = useSearchParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: status } = useImportsStatus();
  const pollNow = usePollNow();
  const backfill = useBackfill();
  const updateSettings = useUpdatePollSettings();
  const disconnect = useDisconnectGmail();

  const [windowDays, setWindowDays] = useState<string>("");
  const [from, setFrom] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [to, setTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (status?.pollWindowDays != null) {
      setWindowDays(String(status.pollWindowDays));
    }
  }, [status?.pollWindowDays]);

  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      toast.success(`Gmail connected: ${connected}`);
      queryClient.invalidateQueries({
        queryKey: trpc.imports.status.queryKey(),
      });
    }
    if (error) toast.error(`Gmail error: ${error}`);
  }, [params, queryClient, trpc]);

  async function handlePollNow() {
    try {
      const result = await pollNow.mutateAsync();
      toast.success(
        `${result.inserted} imported · ${result.alreadyProcessed} already done · ${result.parseFailed + result.fetchError} failed`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Poll failed");
    }
  }

  async function handleSaveWindow() {
    const n = parseInt(windowDays, 10);
    if (!Number.isFinite(n) || n < 1 || n > 90) {
      toast.error("Window must be 1–90 days");
      return;
    }
    try {
      await updateSettings.mutateAsync({ pollWindowDays: n });
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  }

  async function handleBackfill() {
    if (!from || !to) {
      toast.error("Pick from and to dates");
      return;
    }
    try {
      const result = await backfill.mutateAsync({
        from: new Date(from),
        to: new Date(to),
      });
      toast.success(
        `${result.inserted} imported · ${result.alreadyProcessed} already done · ${result.parseFailed + result.fetchError} failed`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backfill failed");
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Gmail? You can reconnect any time.")) return;
    try {
      await disconnect.mutateAsync();
      toast.success("Disconnected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  }

  const lastPoll = status?.lastPollResult as LastPollResult | null | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/finances/imports">
          <ArrowLeft className="size-4" /> Back to imports
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Import settings</h2>
        <p className="text-muted-foreground text-sm">
          Connect Gmail so transactions from BCP, Interbank, and BBVA get
          imported automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gmail connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.connected ? (
            <>
              <div className="text-foreground flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Connected as <span className="font-medium">{status.email}</span>
              </div>
              <div className="text-muted-foreground text-sm">
                {status.lastPolledAt
                  ? `Last polled ${formatDistanceToNow(status.lastPolledAt, {
                      addSuffix: true,
                    })}.`
                  : "Not polled yet."}
                {" "}
                {status.pending} pending import{status.pending === 1 ? "" : "s"}.
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePollNow} disabled={pollNow.isPending}>
                  {pollNow.isPending ? "Polling..." : "Poll now"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnect.isPending}
                >
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <AlertCircle className="size-4" />
                Not connected.
              </div>
              <Button asChild>
                <a href="/api/gmail/auth">
                  <Mail className="size-4" /> Connect Gmail
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How the poll works</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              <span className="text-foreground font-medium">Automatic poll:</span>{" "}
              In production a scheduled job runs every 10 minutes. It connects
              to your Gmail and searches for emails from BCP, Interbank, and
              BBVA. New transactions land on the Imports page for you to confirm.
              <span className="text-muted-foreground italic">
                {" "}
                (Locally, only the &ldquo;Poll now&rdquo; button triggers it.)
              </span>
            </p>
            <p>
              <span className="text-foreground font-medium">Search window:</span>{" "}
              On every poll, Gmail is asked &ldquo;give me transaction emails
              from the last N days.&rdquo; This is the N. Bigger N means each
              poll covers more days, in case the cron missed a window. 7 days is
              usually plenty; bump it if you go a while without checking.
            </p>
            <p>
              <span className="text-foreground font-medium">Dedup:</span>{" "}
              Already imported and currently pending emails are skipped on
              subsequent polls. Dismissed emails are deleted, so they can come
              back on the next poll (handy if you dismissed by mistake).
            </p>
          </CardContent>
        </Card>
      )}

      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default search window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="window">Days back</Label>
                <Input
                  id="window"
                  type="number"
                  min="1"
                  max="90"
                  value={windowDays}
                  onChange={(e) => setWindowDays(e.target.value)}
                  className="w-28"
                />
              </div>
              <Button
                onClick={handleSaveWindow}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backfill specific dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Pull bank emails from a custom date range. Useful for catching up
              on history beyond the default window.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <Button onClick={handleBackfill} disabled={backfill.isPending}>
                {backfill.isPending ? "Running..." : "Backfill"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status?.connected && lastPoll && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last poll details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-xs">
              Ran {formatDistanceToNow(new Date(lastPoll.ranAt), { addSuffix: true })}.
              Gmail returned {lastPoll.total} message{lastPoll.total === 1 ? "" : "s"}.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <SummaryStat
                label="Imported"
                value={lastPoll.inserted}
                tone="text-emerald-600"
              />
              <SummaryStat
                label="Already done"
                value={lastPoll.alreadyProcessed}
                tone="text-muted-foreground"
              />
              <SummaryStat
                label="Unknown sender"
                value={lastPoll.unknownSender}
                tone="text-amber-600"
              />
              <SummaryStat
                label="Parse failed"
                value={lastPoll.parseFailed}
                tone="text-destructive"
              />
              <SummaryStat
                label="Fetch error"
                value={lastPoll.fetchError}
                tone="text-destructive"
              />
            </div>
            {lastPoll.events.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No messages matched the search.
              </p>
            ) : (
              <div className="space-y-2">
                {lastPoll.events.map((ev) => {
                  const meta = OUTCOME_META[ev.outcome];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={ev.emailMessageId}
                      className="border-border flex items-start gap-3 rounded-md border p-3"
                    >
                      <Icon className={`mt-0.5 size-4 shrink-0 ${meta.variant}`} />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="min-w-0 flex-1 truncate font-medium">
                            {ev.subject || <span className="text-muted-foreground italic">(no subject)</span>}
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {meta.label}
                          </Badge>
                        </div>
                        {ev.from && (
                          <div className="text-muted-foreground truncate text-xs">
                            {ev.from}
                          </div>
                        )}
                        {ev.detail && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            {ev.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="border-border rounded-md border p-2">
      <div className={`text-xl font-semibold ${tone}`}>{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}
