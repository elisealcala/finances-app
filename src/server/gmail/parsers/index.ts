import type { BankParser } from "./types";
import { bcpParser } from "./bcp";
import { interbankParser } from "./interbank";
import { bbvaParser } from "./bbva";

export const ALL_PARSERS: BankParser[] = [bcpParser, interbankParser, bbvaParser];

export function getParserForSender(fromHeader: string): BankParser | null {
  return ALL_PARSERS.find((p) => p.matches(fromHeader)) ?? null;
}

const SENDERS =
  "from:(notificaciones@notificacionesbcp.com.pe OR servicioalcliente@netinterbank.com.pe OR procesos@bbva.com.pe)";

function formatGmailDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export function buildGmailQuery(opts: {
  windowDays?: number;
  from?: Date;
  to?: Date;
}): string {
  if (opts.from || opts.to) {
    const parts = [SENDERS];
    if (opts.from) parts.push(`after:${formatGmailDate(opts.from)}`);
    if (opts.to) {
      // Gmail's `before:` is exclusive — add a day so the end date is included
      const endExclusive = new Date(opts.to);
      endExclusive.setDate(endExclusive.getDate() + 1);
      parts.push(`before:${formatGmailDate(endExclusive)}`);
    }
    return parts.join(" ");
  }
  const days = opts.windowDays ?? 7;
  return `${SENDERS} newer_than:${days}d`;
}

export type { BankParser, ParsedTransaction, Bank, Currency, GmailMessageContext } from "./types";
