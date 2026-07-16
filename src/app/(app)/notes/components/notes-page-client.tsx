"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { Plus, ChevronLeft, ChevronRight, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotes } from "@/hooks/use-notes";
import { extractPlainText } from "@/lib/tiptap";

export function NotesPageClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useNotes({ year, month });

  function shift(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Notes</h2>
          <p className="text-muted-foreground text-sm">
            Your personal journal, by month.
          </p>
        </div>
        <Button asChild>
          <Link href="/notes/new">
            <Plus className="size-4" /> New entry
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shift(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-[160px] text-center text-sm font-medium">
          {monthLabel}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => shift(1)}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="size-4" />
        </Button>
        {!isCurrentMonth && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setYear(now.getFullYear());
              setMonth(now.getMonth() + 1);
            }}
          >
            Today
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <NotebookPen className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">No entries this month</p>
            <p className="text-muted-foreground text-sm">
              Start writing your first entry for {monthLabel}.
            </p>
            <Button asChild className="mt-2">
              <Link href="/notes/new">New entry</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {data.map((note) => {
            const preview = extractPlainText(note.content, 160);
            return (
              <Link key={note.id} href={`/notes/${note.id}`}>
                <Card className="hover:bg-accent/40 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <CardTitle className="text-base font-medium">
                        {note.title || "Untitled"}
                      </CardTitle>
                      <span className="text-muted-foreground text-xs">
                        {format(note.date, "EEE, MMM d")}
                      </span>
                    </div>
                  </CardHeader>
                  {preview && (
                    <CardContent className="text-muted-foreground line-clamp-2 pt-0 text-sm">
                      {preview}
                    </CardContent>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
