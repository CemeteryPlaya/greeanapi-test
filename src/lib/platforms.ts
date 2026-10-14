import { GreenApiError, type GreenApi } from '../api/greenApi';
import type { Platform } from '../types';
import { formatPhone } from './phone';

export interface NewChat {
  chatId: string;
  title: string;
  phone: string;
  username?: string;
}

/** Ошибка, текст которой можно показать пользователю как есть. */
export class ChatLookupError extends Error {}

interface PlatformConfig {
  label: string;
  /** Находит chatId собеседника по номеру телефона (цифры с кодом страны). */
  resolveChat: (api: GreenApi, phone: string) => Promise<NewChat>;
}

const isAuthError = (error: unknown) =>
  error instanceof GreenApiError && (error.status === 401 || error.status === 403);

const byPhone = (phone: string): NewChat => ({
  chatId: `${phone}@c.us`,
  title: formatPhone(phone),
  phone,
});

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  whatsapp: {
    label: 'WhatsApp',
    async resolveChat(api, phone) {
      try {
        const result = await api.checkWhatsapp(phone);
        if (result && !result.existsWhatsapp) {
          throw new ChatLookupError('На этот номер не зарегистрирован WhatsApp');
        }
      } catch (error) {
        if (error instanceof ChatLookupError) throw error;
        if (isAuthError(error)) throw new ChatLookupError((error as GreenApiError).message);
        // checkWhatsapp недоступен (лимит, сбой) — не мешаем написать по номеру
      }
      // checkWhatsapp может вернуть chatId вида …@lid, но входящие (без lid-режима)
      // приходят с номер@c.us — используем его, чтобы ответы попадали в этот же чат
      return byPhone(phone);
    },
  },

  telegram: {
    label: 'Telegram',
    async resolveChat(api, phone) {
      try {
        // В Telegram личный чат адресуется числовым chatId — получаем его по номеру
        const account = await api.checkAccount(phone);
        if (account && !account.exist) {
          throw new ChatLookupError('На этот номер не зарегистрирован Telegram');
        }
        if (account?.chatId) {
          return { ...byPhone(phone), chatId: account.chatId, username: account.username || undefined };
        }
      } catch (error) {
        if (error instanceof ChatLookupError) throw error;
        if (isAuthError(error)) throw new ChatLookupError((error as GreenApiError).message);
        // checkAccount недоступен — отправка по номеру@c.us тоже поддерживается,
        // а при первом ответе чат переедет на настоящий chatId (см. chatReducer)
      }
      return byPhone(phone);
    },
  },
};

export const PLATFORM_LIST = Object.keys(PLATFORMS) as Platform[];

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && value in PLATFORMS;
}
