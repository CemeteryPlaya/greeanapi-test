import type { NotificationBody } from '../api/greenApi';
import type { Message, MessageStatus } from '../types';

export type ChatEvent =
  | {
      type: 'message';
      message: Message;
      /** Подсказки для создания/сопоставления чата */
      chatTitle?: string;
      phone?: string;
    }
  | { type: 'status'; chatId: string; id: string; status: MessageStatus };

function extractText(body: NotificationBody): string | null {
  const data = body.messageData;
  if (!data) return null;
  if (data.typeMessage === 'textMessage') return data.textMessageData?.textMessage ?? null;
  if (data.typeMessage === 'extendedTextMessage') return data.extendedTextMessageData?.text ?? null;
  return null;
}

/** WhatsApp: …@g.us, Telegram: отрицательный id */
const isGroupChat = (chatId: string) => chatId.endsWith('@g.us') || chatId.startsWith('-');

/**
 * Номер собеседника: в Telegram — поле senderPhoneNumber,
 * в WhatsApp — сам chatId вида 79991234567@c.us.
 */
function senderPhone(chatId: string, senderPhoneNumber?: number): string | undefined {
  if (senderPhoneNumber) return String(senderPhoneNumber);
  const match = /^(\d+)@c\.us$/.exec(chatId);
  return match?.[1];
}

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  noAccount: 'failed',
  notInGroup: 'failed',
};

/**
 * Превращает уведомление GREEN-API в событие чата.
 * Всё, что не относится к текстовым сообщениям, возвращает null —
 * такое уведомление нужно просто удалить из очереди.
 */
export function parseNotification(body: NotificationBody): ChatEvent | null {
  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const text = extractText(body);
      const sender = body.senderData;
      if (text === null || !sender?.chatId || !body.idMessage) return null;

      const incoming = body.typeWebhook === 'incomingMessageReceived';
      const group = isGroupChat(sender.chatId);
      // в исходящих senderPhoneNumber — наш собственный номер
      const phone = group
        ? undefined
        : senderPhone(sender.chatId, incoming ? sender.senderPhoneNumber : undefined);
      return {
        type: 'message',
        message: {
          id: body.idMessage,
          chatId: sender.chatId,
          text,
          direction: incoming ? 'in' : 'out',
          timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
          status: incoming ? undefined : 'sent',
        },
        // для исходящих senderName — это мы сами, а в группе — участник, а не чат
        chatTitle:
          incoming && !group
            ? sender.senderContactName || sender.senderName || sender.chatName || undefined
            : sender.chatName || undefined,
        phone,
      };
    }

    case 'outgoingMessageStatus': {
      const status = body.status ? STATUS_MAP[body.status] : undefined;
      if (!status || !body.chatId || !body.idMessage) return null;
      return { type: 'status', chatId: body.chatId, id: body.idMessage, status };
    }

    default:
      return null;
  }
}
