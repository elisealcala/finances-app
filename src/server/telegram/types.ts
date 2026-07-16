// Minimal subset of the Telegram Bot API update shape — only the fields the
// webhook handler actually reads.
export type TelegramChat = {
  id: number;
};

export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  date: number;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};
