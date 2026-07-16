export type Bank = "BCP" | "INTERBANK" | "BBVA";
export type Currency = "PEN" | "USD" | "EUR";

export type ParsedTransaction = {
  bank: Bank;
  merchant: string;
  amount: number;
  currency: Currency;
  transactionDate: Date;
  cardLast4: string | null;
};

export type GmailMessageContext = {
  messageId: string;
  fromHeader: string;
  subject: string;
  snippet: string;
  internalDate: Date;
  textBody: string;
  htmlBody: string;
};

export type BankParser = {
  bank: Bank;
  matches: (fromHeader: string) => boolean;
  parse: (msg: GmailMessageContext) => ParsedTransaction | null;
};
