import type { BankParser } from "./types";
import { stripHtml } from "../util";

export const bcpParser: BankParser = {
  bank: "BCP",
  matches: (from) => /notificacionesbcp\.com\.pe/i.test(from),
  parse: (msg) => {
    const body = msg.textBody || stripHtml(msg.htmlBody);
    if (!body) return null;

    const amountMatch = body.match(/S\/\s*([\d,]+\.\d{2})/);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));

    const merchantMatch =
      body.match(/Tarjeta de Cr[eé]dito BCP en\s+([^.\n]+?)\s*\./i) ||
      body.match(/consumo de S\/\s*[\d,]+\.\d{2}\s+(?:con\s+tu\s+)?[^.]*?en\s+([^.\n]+?)\s*\./i);
    if (!merchantMatch) return null;
    const merchant = merchantMatch[1].trim();

    const last4Match = body.match(/(?:Tarjeta|terminada en|terminado en)[^\d]*(\d{4})/i);
    const cardLast4 = last4Match ? last4Match[1] : null;

    return {
      bank: "BCP",
      merchant,
      amount,
      currency: "PEN",
      transactionDate: msg.internalDate,
      cardLast4,
    };
  },
};
