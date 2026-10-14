const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const shortDayFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const formatTime = (timestamp: number) => timeFormat.format(timestamp);

/** Время в списке чатов: сегодня — часы, иначе — дата. */
export function formatListTime(timestamp: number, now = Date.now()): string {
  return startOfDay(timestamp) === startOfDay(now)
    ? timeFormat.format(timestamp)
    : shortDayFormat.format(timestamp);
}

/** Разделитель дней в ленте сообщений. */
export function formatDayDivider(timestamp: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY_MS);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return dayFormat.format(timestamp);
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}
