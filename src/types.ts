export type Platform = 'whatsapp' | 'telegram';

export interface Credentials {
  platform: Platform;
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  /** idMessage из GREEN-API; для ещё не отправленных — временный `local-…` */
  id: string;
  chatId: string;
  text: string;
  direction: 'in' | 'out';
  /** миллисекунды */
  timestamp: number;
  status?: MessageStatus;
}

export interface Chat {
  chatId: string;
  title: string;
  /** только цифры, без «+» */
  phone?: string;
  username?: string;
  unread: number;
  createdAt: number;
}

export interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
}
