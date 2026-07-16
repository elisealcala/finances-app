import type { BankParser } from "./types";
import { stripHtml, parseDdMmYyyy } from "../util";

export const interbankParser: BankParser = {
  bank: "INTERBANK",
  matches: (from) => /netinterbank\.com\.pe/i.test(from),
  parse: (msg) => {
    const body = msg.textBody || stripHtml(msg.htmlBody);
    if (!body) return null;

    const cardMatch = body.match(/Tarjeta:\s*\*+(\d{4})/i);
    const merchantMatch = body.match(/Comercio:\s*(.+?)(?:\s{2,}|Monto:|$)/i);
    const amountMatch = body.match(/Monto:\s*S\/?\.?\s*([\d,]+\.?\d*)/i);
    const dateMatch = body.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i);

    if (!amountMatch || !merchantMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    const date = dateMatch ? parseDdMmYyyy(dateMatch[1]) : msg.internalDate;
    if (!date) return null;

    return {
      bank: "INTERBANK",
      merchant: merchantMatch[1].trim(),
      amount,
      currency: "PEN",
      transactionDate: date,
      cardLast4: cardMatch ? cardMatch[1] : null,
    };
  },
};
