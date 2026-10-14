import { initialChatState } from '../store/chatReducer';
import { isPlatform } from './platforms';
import type { ChatState, Credentials } from '../types';

const CREDENTIALS_KEY = 'greenapi-chat:credentials';
const chatsKey = (idInstance: string) => `greenapi-chat:chats:${idInstance}`;

// localStorage может быть недоступен (приватный режим, запрет cookies) — приложение работает и без него
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно или переполнено */
  }
}

export function loadCredentials(): Credentials | null {
  const saved = read<Credentials>(CREDENTIALS_KEY);
  if (!saved?.idInstance || !saved.apiTokenInstance) return null;
  // сохранённые до появления WhatsApp данные относились к Telegram
  return { ...saved, platform: isPlatform(saved.platform) ? saved.platform : 'telegram' };
}

export const saveCredentials = (credentials: Credentials | null) => write(CREDENTIALS_KEY, credentials);

export function loadChatState(idInstance: string): ChatState {
  const saved = read<ChatState>(chatsKey(idInstance));
  if (!saved?.chats || !saved.messages) return initialChatState;
  return { ...saved, activeChatId: null };
}

export function saveChatState(idInstance: string, state: ChatState): void {
  write(chatsKey(idInstance), { chats: state.chats, messages: state.messages });
}
