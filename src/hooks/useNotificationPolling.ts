import { useEffect, useRef, useState } from 'react';
import type { GreenApi, NotificationBody } from '../api/greenApi';

export type ConnectionState = 'connecting' | 'online' | 'error';

const RECEIVE_TIMEOUT_SECONDS = 20;
const RETRY_DELAY_MS = 3000;

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Получение входящих по технологии HTTP API:
 * receiveNotification (long-poll) → обработка → deleteNotification, и так по кругу.
 * Уведомление удаляется всегда, даже если оно нам не интересно, иначе очередь встанет.
 */
export function useNotificationPolling(
  api: GreenApi,
  onNotification: (body: NotificationBody) => void,
): ConnectionState {
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const handlerRef = useRef(onNotification);

  useEffect(() => {
    handlerRef.current = onNotification;
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      while (!signal.aborted) {
        try {
          const notification = await api.receiveNotification(RECEIVE_TIMEOUT_SECONDS, signal);
          setConnection('online');
          if (!notification) continue;

          try {
            handlerRef.current(notification.body);
          } catch (error) {
            console.error('Не удалось обработать уведомление', notification, error);
          }
          await api.deleteNotification(notification.receiptId, signal);
        } catch (error) {
          if (signal.aborted) return;
          console.error('Ошибка получения уведомлений', error);
          setConnection('error');
          await delay(RETRY_DELAY_MS, signal);
        }
      }
    })();

    return () => controller.abort();
  }, [api]);

  return connection;
}
