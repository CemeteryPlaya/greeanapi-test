import { formatPhone } from '../lib/phone';
import type { Chat, ChatState, Message, MessageStatus } from '../types';

export type ChatAction =
  | { type: 'chatOpened'; chatId: string; title: string; phone?: string; username?: string }
  | { type: 'chatSelected'; chatId: string | null }
  | { type: 'messageReceived'; message: Message; chatTitle?: string; phone?: string }
  | { type: 'messageSent'; tempId: string; id: string }
  | { type: 'messageFailed'; tempId: string }
  | { type: 'statusUpdated'; chatId: string; id: string; status: MessageStatus };

export const initialChatState: ChatState = { chats: [], messages: {}, activeChatId: null };

const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

function updateChat(chats: Chat[], chatId: string, patch: (chat: Chat) => Chat): Chat[] {
  return chats.map((chat) => (chat.chatId === chatId ? patch(chat) : chat));
}

/** Ищет чат, в котором лежит сообщение с данным id. */
function findMessageChat(state: ChatState, id: string): string | undefined {
  return Object.keys(state.messages).find((chatId) =>
    state.messages[chatId].some((message) => message.id === id),
  );
}

function sortByTime(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Если чат создавался по номеру (`7999…@c.us`), а собеседник ответил,
 * GREEN-API пришлёт его настоящий числовой chatId. Переносим чат на него.
 */
function migrateChat(state: ChatState, fromId: string, toId: string): ChatState {
  const { [fromId]: moved = [], ...rest } = state.messages;
  return {
    ...state,
    chats: updateChat(state.chats, fromId, (chat) => ({ ...chat, chatId: toId })),
    messages: { ...rest, [toId]: moved.map((message) => ({ ...message, chatId: toId })) },
    activeChatId: state.activeChatId === fromId ? toId : state.activeChatId,
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chatOpened': {
      const existing =
        state.chats.find((chat) => chat.chatId === action.chatId) ??
        (action.phone ? state.chats.find((chat) => chat.phone === action.phone) : undefined);
      if (existing) {
        return { ...state, activeChatId: existing.chatId };
      }
      const chat: Chat = {
        chatId: action.chatId,
        title: action.title,
        phone: action.phone,
        username: action.username,
        unread: 0,
        createdAt: Date.now(),
      };
      return {
        ...state,
        chats: [chat, ...state.chats],
        messages: { ...state.messages, [chat.chatId]: [] },
        activeChatId: chat.chatId,
      };
    }

    case 'chatSelected': {
      if (!action.chatId) return { ...state, activeChatId: null };
      return {
        ...state,
        activeChatId: action.chatId,
        chats: updateChat(state.chats, action.chatId, (chat) => ({ ...chat, unread: 0 })),
      };
    }

    case 'messageReceived': {
      const { message, phone } = action;
      let next = state;

      let chat = next.chats.find((c) => c.chatId === message.chatId);
      if (!chat && phone) {
        const byPhone = next.chats.find((c) => c.phone === phone);
        if (byPhone) {
          next = migrateChat(next, byPhone.chatId, message.chatId);
          chat = next.chats.find((c) => c.chatId === message.chatId);
        }
      }

      if (!chat) {
        chat = {
          chatId: message.chatId,
          title: action.chatTitle || (phone ? formatPhone(phone) : message.chatId),
          phone,
          unread: 0,
          createdAt: message.timestamp,
        };
        next = { ...next, chats: [chat, ...next.chats] };
      }

      const list = next.messages[message.chatId] ?? [];
      // outgoingAPIMessageReceived приходит и для наших же отправок — не дублируем
      if (list.some((m) => m.id === message.id)) return next;

      const countsAsUnread = message.direction === 'in' && next.activeChatId !== message.chatId;
      return {
        ...next,
        chats: updateChat(next.chats, message.chatId, (c) => ({
          ...c,
          unread: countsAsUnread ? c.unread + 1 : c.unread,
          // имя контакта лучше, чем голый номер, которым чат был назван при создании
          title: message.direction === 'in' && action.chatTitle ? action.chatTitle : c.title,
          phone: c.phone ?? phone,
        })),
        messages: { ...next.messages, [message.chatId]: sortByTime([...list, message]) },
      };
    }

    case 'messageSent': {
      const chatId = findMessageChat(state, action.tempId);
      if (!chatId) return state;
      const list = state.messages[chatId];
      // уведомление outgoingAPIMessageReceived могло успеть прийти раньше ответа sendMessage
      const alreadyKnown = list.some((m) => m.id === action.id);
      const updated = alreadyKnown
        ? list.filter((m) => m.id !== action.tempId)
        : list.map((m) =>
            m.id === action.tempId ? { ...m, id: action.id, status: 'sent' as const } : m,
          );
      return { ...state, messages: { ...state.messages, [chatId]: updated } };
    }

    case 'messageFailed': {
      const chatId = findMessageChat(state, action.tempId);
      if (!chatId) return state;
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: state.messages[chatId].map((m) =>
            m.id === action.tempId ? { ...m, status: 'failed' as const } : m,
          ),
        },
      };
    }

    case 'statusUpdated': {
      const chatId = state.messages[action.chatId] ? action.chatId : findMessageChat(state, action.id);
      if (!chatId) return state;
      let changed = false;
      const updated = state.messages[chatId].map((m) => {
        if (m.id !== action.id || !m.status) return m;
        // статусы приходят не строго по порядку — не откатываем «прочитано» в «доставлено»
        if (STATUS_RANK[action.status] <= STATUS_RANK[m.status]) return m;
        changed = true;
        return { ...m, status: action.status };
      });
      return changed ? { ...state, messages: { ...state.messages, [chatId]: updated } } : state;
    }
  }
}

export function lastMessage(state: ChatState, chatId: string): Message | undefined {
  const list = state.messages[chatId];
  return list?.[list.length - 1];
}

/** Чаты в порядке последней активности, как в мессенджере. */
export function sortedChats(state: ChatState): Chat[] {
  const activity = (chat: Chat) => lastMessage(state, chat.chatId)?.timestamp ?? chat.createdAt;
  return [...state.chats].sort((a, b) => activity(b) - activity(a));
}
