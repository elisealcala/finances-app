import "server-only";
import { google } from "googleapis";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { getAuthorizedClient } from "./oauth";
import { extractMessageBody } from "./util";
import { getParserForSender, buildGmailQuery } from "./parsers";
import type { GmailMessageContext } from "./parsers";

export type PollEventOutcome =
  | "IMPORTED_NEW"
  | "ALREADY_PROCESSED"
  | "UNKNOWN_SENDER"
  | "PARSE_FAILED"
  | "FETCH_ERROR";

export type PollEvent = {
  emailMessageId: string;
  from: string | null;
  subject: string | null;
  emailDate: string | null;
  outcome: PollEventOutcome;
  detail: string | null;
};

export type PollResult = {
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

export type PollOptions = {
  windowDays?: number;
  from?: Date;
  to?: Date;
};

export async function pollGmail(options: PollOptions = {}): Promise<PollResult> {
  const session = await getAuthorizedClient();
  if (!session) {
    throw new Error("No Gmail credential. Connect Gmail first.");
  }

  const query = buildGmailQuery({
    windowDays: options.windowDays ?? session.credential.pollWindowDays,
    from: options.from,
    to: options.to,
  });

  const gmail = google.gmail({ version: "v1", auth: session.client });
  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 100,
  });

  const messages = list.data.messages ?? [];
  const events: PollEvent[] = [];
  let inserted = 0;
  let alreadyProcessed = 0;
  let unknownSender = 0;
  let parseFailed = 0;
  let fetchError = 0;

  for (const m of messages) {
    if (!m.id) continue;

    const existing = await db.pendingImport.findUnique({
      where: { emailMessageId: m.id },
    });
    if (existing) {
      if (existing.status === "DISMISSED") {
        // Old soft-dismissed row — delete so we can re-import this message.
        await db.pendingImport.delete({ where: { id: existing.id } });
      } else {
        alreadyProcessed++;
        events.push({
          emailMessageId: m.id,
          from: null,
          subject: existing.rawSubject,
          emailDate: existing.emailDate.toISOString(),
          outcome: "ALREADY_PROCESSED",
          detail: `Status: ${existing.status}`,
        });
        continue;
      }
    }

    try {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: m.id,
        format: "full",
      });

      const headers = detail.data.payload?.headers ?? [];
      const fromHeader =
        headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
      const subject =
        headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "";
      const internalDate = detail.data.internalDate
        ? new Date(parseInt(detail.data.internalDate, 10))
        : new Date();

      const parser = getParserForSender(fromHeader);
      if (!parser) {
        unknownSender++;
        events.push({
          emailMessageId: m.id,
          from: fromHeader,
          subject,
          emailDate: internalDate.toISOString(),
          outcome: "UNKNOWN_SENDER",
          detail: "No parser registered for this sender",
        });
        continue;
      }

      const { text, html } = extractMessageBody(detail.data.payload ?? {});
      const ctx: GmailMessageContext = {
        messageId: m.id,
        fromHeader,
        subject,
        snippet: detail.data.snippet ?? "",
        internalDate,
        textBody: text,
        htmlBody: html,
      };

      const parsed = parser.parse(ctx);
      if (!parsed) {
        parseFailed++;
        events.push({
          emailMessageId: m.id,
          from: fromHeader,
          subject,
          emailDate: internalDate.toISOString(),
          outcome: "PARSE_FAILED",
          detail: `${parser.bank} parser could not extract required fields (merchant/amount)`,
        });
        continue;
      }

      const normalizedLast4 = parsed.cardLast4
        ? parsed.cardLast4.replace(/\D/g, "").slice(-4)
        : null;

      let accountId: string | null = null;
      let matchWarning: string | null = null;
      if (normalizedLast4 && normalizedLast4.length === 4) {
        const account = await db.account.findFirst({
          where: { cardLast4: normalizedLast4, isArchived: false },
          select: { id: true },
        });
        if (account) accountId = account.id;
        else matchWarning = "no_matching_card";
      } else {
        matchWarning = "no_card_in_email";
      }

      await db.pendingImport.create({
        data: {
          bank: parsed.bank,
          emailMessageId: m.id,
          emailDate: internalDate,
          rawSubject: subject,
          rawSnippet: ctx.snippet,
          merchant: parsed.merchant,
          amount: new Prisma.Decimal(parsed.amount),
          currency: parsed.currency,
          transactionDate: parsed.transactionDate,
          cardLast4: normalizedLast4,
          accountId,
          matchWarning,
        },
      });
      inserted++;
      events.push({
        emailMessageId: m.id,
        from: fromHeader,
        subject,
        emailDate: internalDate.toISOString(),
        outcome: "IMPORTED_NEW",
        detail: `${parsed.bank} · ${parsed.merchant} · ${parsed.currency} ${parsed.amount.toFixed(2)}${matchWarning ? ` · ${matchWarning}` : ""}`,
      });
    } catch (err) {
      console.error("Gmail poll error for message", m.id, err);
      fetchError++;
      events.push({
        emailMessageId: m.id,
        from: null,
        subject: null,
        emailDate: null,
        outcome: "FETCH_ERROR",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const result: PollResult = {
    inserted,
    alreadyProcessed,
    unknownSender,
    parseFailed,
    fetchError,
    total: messages.length,
    query,
    events,
    ranAt: new Date().toISOString(),
  };

  await db.gmailCredential.update({
    where: { id: session.credential.id },
    data: {
      lastPolledAt: new Date(),
      lastPollResult: result as unknown as Prisma.InputJsonValue,
    },
  });

  return result;
}
