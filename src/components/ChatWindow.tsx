import { Fragment, useEffect, useRef } from 'react';
import { formatPhone } from '../lib/phone';
import { formatDayDivider, formatTime, isSameDay } from '../lib/format';
import type { Chat, Message } from '../types';
import { Avatar } from './Avatar';
import { Composer } from './Composer';
import { BackIcon, CheckIcon, ClockIcon } from './icons';

function StatusMark({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <span className="status" title="Отправляется">
          <ClockIcon />
        </span>
      );
    case 'sent':
      return (
        <span className="status" title="Отправлено">
          <CheckIcon />
        </span>
      );
    case 'delivered':
      return (
        <span className="status" title="Доставлено">
          <CheckIcon double />
        </span>
      );
    case 'read':
      return (
        <span className="status status--read" title="Прочитано">
          <CheckIcon double />
        </span>
      );
    case 'failed':
      return <span className="status status--failed">Не отправлено</span>;
    default:
      return null;
  }
}

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  onSend: (text: string) => void;
  onBack: () => void;
}

export function ChatWindow({ chat, messages, onSend, onBack }: ChatWindowProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, chat.chatId]);

  const subtitle = [chat.phone && formatPhone(chat.phone), chat.username].filter(Boolean).join(' · ');

  return (
    <section className="chat">
      <header className="chat__header">
        <button className="icon-button chat__back" onClick={onBack} aria-label="Назад к чатам">
          <BackIcon />
        </button>
        <Avatar id={chat.chatId} title={chat.title} size={40} />
        <div className="chat__info">
          <h2 className="chat__title">{chat.title}</h2>
          {subtitle && subtitle !== chat.title && <span className="chat__subtitle">{subtitle}</span>}
        </div>
      </header>

      <div className="chat__messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat__empty">
            <p>Здесь пока пусто</p>
            <span>Напишите первое сообщение</span>
          </div>
        )}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const newDay = !previous || !isSameDay(previous.timestamp, message.timestamp);
          const grouped = !newDay && previous?.direction === message.direction;
          return (
            <Fragment key={message.id}>
              {newDay && (
                <div className="day-divider">
                  <span>{formatDayDivider(message.timestamp)}</span>
                </div>
              )}
              <div
                className={`bubble bubble--${message.direction}${grouped ? ' bubble--grouped' : ''}${
                  message.status === 'failed' ? ' bubble--failed' : ''
                }`}
              >
                <span className="bubble__text">{message.text}</span>
                <span className="bubble__meta">
                  {formatTime(message.timestamp)}
                  {message.direction === 'out' && <StatusMark status={message.status} />}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>

      <Composer key={chat.chatId} onSend={onSend} />
    </section>
  );
}
