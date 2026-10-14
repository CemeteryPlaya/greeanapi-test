import { useMemo, useState } from 'react';
import type { GreenApi } from '../api/greenApi';
import type { ConnectionState } from '../hooks/useNotificationPolling';
import { formatListTime } from '../lib/format';
import { lastMessage, sortedChats } from '../store/chatReducer';
import { PLATFORMS, type NewChat } from '../lib/platforms';
import type { ChatState, Platform } from '../types';
import { Avatar } from './Avatar';
import { ComposeIcon, LogoutIcon, SearchIcon } from './icons';
import { NewChatForm } from './NewChatForm';

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connecting: 'Подключение…',
  online: 'В сети',
  error: 'Нет связи с GREEN-API, переподключаемся…',
};

interface SidebarProps {
  api: GreenApi;
  platform: Platform;
  state: ChatState;
  connection: ConnectionState;
  onSelect: (chatId: string) => void;
  onCreate: (chat: NewChat) => void;
  onLogout: () => void;
}

export function Sidebar({ api, platform, state, connection, onSelect, onCreate, onLogout }: SidebarProps) {
  const [creating, setCreating] = useState(state.chats.length === 0);
  const [query, setQuery] = useState('');

  const chats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = sortedChats(state);
    if (!needle) return all;
    const digits = needle.replace(/\D/g, '');
    return all.filter(
      (chat) =>
        chat.title.toLowerCase().includes(needle) || (digits !== '' && !!chat.phone?.includes(digits)),
    );
  }, [state, query]);

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div className="sidebar__heading">
          <h2 className="sidebar__title">
            Чаты <span className={`platform-tag platform-tag--${platform}`}>{PLATFORMS[platform].label}</span>
          </h2>
          <span className={`connection connection--${connection}`}>{CONNECTION_LABEL[connection]}</span>
        </div>
        <button
          className="icon-button"
          onClick={() => setCreating((value) => !value)}
          aria-label="Новый чат"
          title="Новый чат"
        >
          <ComposeIcon />
        </button>
        <button className="icon-button sidebar__logout" onClick={onLogout} aria-label="Выйти" title="Выйти">
          <LogoutIcon />
        </button>
      </header>

      {creating ? (
        <NewChatForm
          api={api}
          platform={platform}
          onCancel={() => setCreating(false)}
          onCreate={(chat) => {
            onCreate(chat);
            setCreating(false);
          }}
        />
      ) : (
        <label className="search">
          <SearchIcon />
          <input
            className="search__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            aria-label="Поиск по чатам"
          />
        </label>
      )}

      <ul className="chat-list">
        {chats.map((chat) => {
          const last = lastMessage(state, chat.chatId);
          const active = chat.chatId === state.activeChatId;
          return (
            <li key={chat.chatId}>
              <button
                className={`chat-item${active ? ' chat-item--active' : ''}`}
                onClick={() => onSelect(chat.chatId)}
                aria-current={active ? 'true' : undefined}
              >
                <Avatar id={chat.chatId} title={chat.title} />
                <div className="chat-item__body">
                  <div className="chat-item__row">
                    <span className="chat-item__title">{chat.title}</span>
                    <span className="chat-item__time">
                      {formatListTime(last?.timestamp ?? chat.createdAt)}
                    </span>
                  </div>
                  <div className="chat-item__row">
                    <span className="chat-item__preview">
                      {last ? (
                        <>
                          {last.direction === 'out' && <span className="chat-item__you">Вы: </span>}
                          {last.text}
                        </>
                      ) : (
                        'Нет сообщений'
                      )}
                    </span>
                    {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {chats.length === 0 && !creating && (
          <li className="chat-list__empty">
            {query ? 'Ничего не найдено' : 'Создайте чат по номеру телефона'}
          </li>
        )}
      </ul>
    </aside>
  );
}
