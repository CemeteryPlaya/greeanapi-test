import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { createGreenApi, type NotificationBody } from '../api/greenApi';
import { useNotificationPolling } from '../hooks/useNotificationPolling';
import { parseNotification } from '../lib/notifications';
import { PLATFORMS, type NewChat } from '../lib/platforms';
import { loadChatState, saveChatState } from '../lib/storage';
import { chatReducer } from '../store/chatReducer';
import type { Credentials } from '../types';
import { ChatWindow } from './ChatWindow';
import { ChatsIcon, LogoutIcon } from './icons';
import { Sidebar } from './Sidebar';

interface MessengerProps {
  credentials: Credentials;
  onLogout: () => void;
}

export function Messenger({ credentials, onLogout }: MessengerProps) {
  const api = useMemo(() => createGreenApi(credentials), [credentials]);
  const [state, dispatch] = useReducer(chatReducer, credentials.idInstance, loadChatState);

  useEffect(() => {
    saveChatState(credentials.idInstance, state);
  }, [credentials.idInstance, state]);

  const handleNotification = useCallback((body: NotificationBody) => {
    const event = parseNotification(body);
    if (!event) return;
    if (event.type === 'message') {
      dispatch({ type: 'messageReceived', message: event.message, chatTitle: event.chatTitle, phone: event.phone });
    } else {
      dispatch({ type: 'statusUpdated', chatId: event.chatId, id: event.id, status: event.status });
    }
  }, []);

  const connection = useNotificationPolling(api, handleNotification);

  const activeChat = state.chats.find((chat) => chat.chatId === state.activeChatId) ?? null;

  async function handleSend(text: string) {
    if (!activeChat) return;
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({
      type: 'messageReceived',
      message: {
        id: tempId,
        chatId: activeChat.chatId,
        text,
        direction: 'out',
        timestamp: Date.now(),
        status: 'pending',
      },
    });
    try {
      const { idMessage } = await api.sendMessage(activeChat.chatId, text);
      dispatch({ type: 'messageSent', tempId, id: idMessage });
    } catch (error) {
      console.error('Не удалось отправить сообщение', error);
      dispatch({ type: 'messageFailed', tempId });
    }
  }

  function handleCreate(chat: NewChat) {
    dispatch({ type: 'chatOpened', ...chat });
  }

  return (
    <div className={`messenger${activeChat ? ' messenger--chat-open' : ''}`}>
      <nav className="rail" aria-label="Навигация">
        <img className="rail__logo" src="./favicon.svg" alt="" width={36} height={36} />
        <button className="rail__item rail__item--active" aria-label="Чаты" title="Чаты">
          <ChatsIcon />
        </button>
        <div className="rail__spacer" />
        <span
          className="rail__instance"
          title={`${PLATFORMS[credentials.platform].label} · idInstance ${credentials.idInstance}`}
        >
          {credentials.idInstance.slice(-4)}
        </span>
        <button className="rail__item" onClick={onLogout} aria-label="Выйти" title="Выйти">
          <LogoutIcon />
        </button>
      </nav>

      <Sidebar
        api={api}
        platform={credentials.platform}
        state={state}
        connection={connection}
        onSelect={(chatId) => dispatch({ type: 'chatSelected', chatId })}
        onCreate={handleCreate}
        onLogout={onLogout}
      />

      {activeChat ? (
        <ChatWindow
          chat={activeChat}
          messages={state.messages[activeChat.chatId] ?? []}
          onSend={handleSend}
          onBack={() => dispatch({ type: 'chatSelected', chatId: null })}
        />
      ) : (
        <section className="placeholder">
          <div className="placeholder__card">
            <ChatsIcon />
            <p>Выберите чат или создайте новый по номеру телефона</p>
          </div>
        </section>
      )}
    </div>
  );
}
