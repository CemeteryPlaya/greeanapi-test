import type { Credentials } from '../types';

export const DEFAULT_API_URL = 'https://api.green-api.com';

export class GreenApiError extends Error {
  readonly status?: number;
  /** Адрес запроса со скрытым токеном — для диагностики */
  readonly requestUrl?: string;

  constructor(message: string, status?: number, requestUrl?: string) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
    this.requestUrl = requestUrl;
  }
}

export interface StateInstanceResponse {
  stateInstance: string;
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId: string;
  username?: string;
  phoneNumber?: number;
}

export interface CheckWhatsappResponse {
  existsWhatsapp: boolean;
  chatId?: string;
}

export interface SendMessageResponse {
  idMessage: string;
}

/** Тело уведомления: описываем только поля, которые использует приложение. */
export interface NotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  chatId?: string;
  status?: string;
  senderData?: {
    chatId: string;
    chatName?: string;
    sender?: string;
    senderName?: string;
    senderContactName?: string;
    senderPhoneNumber?: number;
  };
  messageData?: {
    typeMessage: string;
    textMessageData?: { textMessage: string };
    extendedTextMessageData?: { text: string };
  };
}

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}

/** apiUrl — только схема и хост: лишний путь (например, скопированный …/waInstance…) отбрасывается. */
export function normalizeApiUrl(apiUrl: string): string {
  const trimmed = apiUrl.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed) return DEFAULT_API_URL;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return withProtocol.replace(/\/+$/, '');
  }
}

/** idInstance — только цифры (на случай вставки «waInstance1101…» или с пробелами). */
export const normalizeIdInstance = (idInstance: string) => idInstance.replace(/\D/g, '');

/**
 * Номер сервера в apiUrl (7103.api.green-api.com) совпадает с первыми цифрами idInstance.
 * Возвращает подсказку, если они расходятся, — частая причина 404.
 */
export function instanceHostHint(apiUrl: string, idInstance: string): string | null {
  const host = /^https?:\/\/(\d{4})\./.exec(normalizeApiUrl(apiUrl))?.[1];
  const id = normalizeIdInstance(idInstance);
  if (!host || !id || id.startsWith(host)) return null;
  return `idInstance ${id} не похож на инстанс сервера ${host} — возможно, apiUrl от другого инстанса (ожидается https://${id.slice(0, 4)}.api.green-api.com)`;
}

function describeStatus(status: number): string {
  if (status === 401 || status === 403) return 'Неверный idInstance или apiTokenInstance';
  if (status === 404) return 'GREEN-API не нашёл инстанс по этому адресу — проверьте apiUrl и idInstance';
  if (status === 429) return 'Слишком много запросов, попробуйте позже';
  if (status === 466) return 'Исчерпан лимит запросов тарифа (466)';
  if (status >= 500) return `Сервер GREEN-API недоступен (${status})`;
  return `Ошибка GREEN-API (${status})`;
}

export type GreenApi = ReturnType<typeof createGreenApi>;

export function createGreenApi(credentials: Credentials) {
  const base = `${normalizeApiUrl(credentials.apiUrl)}/waInstance${normalizeIdInstance(credentials.idInstance)}`;
  const token = credentials.apiTokenInstance.trim();
  const url = (method: string, suffix = '') => `${base}/${method}/${token}${suffix}`;
  const masked = (input: string) => (token ? input.replace(token, '***') : input);

  async function request<T>(input: string, init: RequestInit = {}): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      if (init.signal?.aborted) throw error;
      throw new GreenApiError('Нет соединения с GREEN-API', undefined, masked(input));
    }
    if (!response.ok) {
      throw new GreenApiError(describeStatus(response.status), response.status, masked(input));
    }

    // receiveNotification по таймауту отдаёт пустое тело или `null`
    const text = await response.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T | null;
  }

  function postJson<T>(method: string, body: unknown) {
    return request<T>(url(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  return {
    getStateInstance: () => request<StateInstanceResponse>(url('getStateInstance')),

    /** Telegram: возвращает числовой chatId по номеру */
    checkAccount: (phone: string) =>
      postJson<CheckAccountResponse>('checkAccount', { phoneNumber: Number(phone) }),

    /** WhatsApp: проверяет, зарегистрирован ли номер */
    checkWhatsapp: (phone: string) =>
      postJson<CheckWhatsappResponse>('checkWhatsapp', { phoneNumber: Number(phone) }),

    sendMessage: async (chatId: string, message: string) => {
      const result = await postJson<SendMessageResponse>('sendMessage', { chatId, message });
      if (!result?.idMessage) throw new GreenApiError('GREEN-API не вернул idMessage');
      return result;
    },

    receiveNotification: (receiveTimeout: number, signal?: AbortSignal) =>
      request<Notification>(url('receiveNotification', `?receiveTimeout=${receiveTimeout}`), { signal }),

    deleteNotification: (receiptId: number, signal?: AbortSignal) =>
      request<{ result: boolean }>(url('deleteNotification', `/${receiptId}`), {
        method: 'DELETE',
        signal,
      }),
  };
}
