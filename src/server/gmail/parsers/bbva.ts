import type { BankParser, Currency } from "./types";
import { stripHtml, parseDdMmYyyy } from "../util";

export const bbvaParser: BankParser = {
  bank: "BBVA",
  matches: (from) => /bbva\.com\.pe/i.test(from),
  parse: (msg) => {
    const body = msg.textBody || stripHtml(msg.htmlBody);
    if (!body) return null;

    const merchantMatch = body.match(/Comercio:\s*([^\n]+?)(?:\s{2,}|Monto:|Moneda:|$)/i);
    const amountMatch = body.match(/Monto:\s*([\d,]+\.?\d*)/i);
    const currencyMatch = body.match(/Moneda:\s*(PEN|USD|EUR|S\/|US\$|€)/i);
    const dateMatch = body.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const cardMatch = body.match(/terminada en\s*\*?(\d{4})/i);

    if (!amountMatch || !merchantMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    const date = dateMatch ? parseDdMmYyyy(dateMatch[1]) : msg.internalDate;
    if (!date) return null;

    let currency: Currency = "PEN";
    if (currencyMatch) {
      const raw = currencyMatch[1].toUpperCase();
      if (raw === "USD" || raw === "US$") currency = "USD";
      else if (raw === "EUR" || raw === "€") currency = "EUR";
    }

    return {
      bank: "BBVA",
      merchant: merchantMatch[1].trim(),
      amount,
      currency,
      transactionDate: date,
      cardLast4: cardMatch ? cardMatch[1] : null,
    };
  },
};
