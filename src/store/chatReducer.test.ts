import { describe, expect, it } from 'vitest';
import type { ChatState, Message } from '../types';
import { chatReducer, initialChatState, sortedChats } from './chatReducer';

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 'm1',
  chatId: '10000000',
  text: 'Привет',
  direction: 'in',
  timestamp: 1000,
  ...overrides,
});

function openChat(state: ChatState = initialChatState, chatId = '10000000', phone = '79991234567') {
  return chatReducer(state, { type: 'chatOpened', chatId, title: '+7 999 123-45-67', phone });
}

describe('chatReducer', () => {
  it('создаёт чат и делает его активным', () => {
    const state = openChat();
    expect(state.chats).toHaveLength(1);
    expect(state.activeChatId).toBe('10000000');
    expect(state.messages['10000000']).toEqual([]);
  });

  it('повторное создание чата с тем же номером открывает существующий', () => {
    const state = openChat(openChat(), '79991234567@c.us', '79991234567');
    expect(state.chats).toHaveLength(1);
    expect(state.activeChatId).toBe('10000000');
  });

  it('входящее от неизвестного собеседника создаёт чат', () => {
    const state = chatReducer(initialChatState, {
      type: 'messageReceived',
      message: message(),
      chatTitle: 'Иван',
      phone: '79998887766',
    });
    expect(state.chats[0]).toMatchObject({ chatId: '10000000', title: 'Иван', unread: 1 });
    expect(state.messages['10000000']).toHaveLength(1);
  });

  it('не дублирует сообщение с тем же id', () => {
    let state = chatReducer(initialChatState, { type: 'messageReceived', message: message() });
    state = chatReducer(state, { type: 'messageReceived', message: message() });
    expect(state.messages['10000000']).toHaveLength(1);
  });

  it('не увеличивает счётчик непрочитанных в открытом чате', () => {
    const state = chatReducer(openChat(), { type: 'messageReceived', message: message() });
    expect(state.chats[0].unread).toBe(0);
  });

  it('переносит чат, созданный по номеру, на настоящий chatId', () => {
    let state = openChat(initialChatState, '79991234567@c.us', '79991234567');
    state = chatReducer(state, {
      type: 'messageReceived',
      message: message({ id: 'out-1', chatId: '79991234567@c.us', direction: 'out', status: 'sent' }),
    });
    state = chatReducer(state, {
      type: 'messageReceived',
      message: message({ id: 'in-1', chatId: '10000000', timestamp: 2000 }),
      chatTitle: 'Иван',
      phone: '79991234567',
    });

    expect(state.chats).toHaveLength(1);
    expect(state.chats[0]).toMatchObject({ chatId: '10000000', title: 'Иван' });
    expect(state.activeChatId).toBe('10000000');
    expect(state.messages['79991234567@c.us']).toBeUndefined();
    expect(state.messages['10000000'].map((m) => m.id)).toEqual(['out-1', 'in-1']);
  });

  it('заменяет временный id на idMessage после отправки', () => {
    let state = chatReducer(openChat(), {
      type: 'messageReceived',
      message: message({ id: 'local-1', direction: 'out', status: 'pending' }),
    });
    state = chatReducer(state, { type: 'messageSent', tempId: 'local-1', id: 'real-1' });
    expect(state.messages['10000000']).toEqual([
      expect.objectContaining({ id: 'real-1', status: 'sent' }),
    ]);
  });

  it('убирает временное сообщение, если уведомление о нём пришло раньше ответа', () => {
    let state = chatReducer(openChat(), {
      type: 'messageReceived',
      message: message({ id: 'local-1', direction: 'out', status: 'pending' }),
    });
    state = chatReducer(state, {
      type: 'messageReceived',
      message: message({ id: 'real-1', direction: 'out', status: 'sent' }),
    });
    state = chatReducer(state, { type: 'messageSent', tempId: 'local-1', id: 'real-1' });
    expect(state.messages['10000000'].map((m) => m.id)).toEqual(['real-1']);
  });

  it('помечает сообщение как неотправленное', () => {
    let state = chatReducer(openChat(), {
      type: 'messageReceived',
      message: message({ id: 'local-1', direction: 'out', status: 'pending' }),
    });
    state = chatReducer(state, { type: 'messageFailed', tempId: 'local-1' });
    expect(state.messages['10000000'][0].status).toBe('failed');
  });

  it('не откатывает статус назад', () => {
    let state = chatReducer(openChat(), {
      type: 'messageReceived',
      message: message({ id: 'out-1', direction: 'out', status: 'sent' }),
    });
    state = chatReducer(state, { type: 'statusUpdated', chatId: '10000000', id: 'out-1', status: 'read' });
    state = chatReducer(state, { type: 'statusUpdated', chatId: '10000000', id: 'out-1', status: 'delivered' });
    expect(state.messages['10000000'][0].status).toBe('read');
  });

  it('выбор чата сбрасывает непрочитанные', () => {
    let state = chatReducer(initialChatState, { type: 'messageReceived', message: message() });
    state = chatReducer(state, { type: 'chatSelected', chatId: '10000000' });
    expect(state.chats[0].unread).toBe(0);
  });
});

describe('sortedChats', () => {
  it('сортирует по последней активности', () => {
    let state = chatReducer(initialChatState, {
      type: 'messageReceived',
      message: message({ id: 'a', chatId: 'A', timestamp: 1000 }),
    });
    state = chatReducer(state, {
      type: 'messageReceived',
      message: message({ id: 'b', chatId: 'B', timestamp: 2000 }),
    });
    state = chatReducer(state, {
      type: 'messageReceived',
      message: message({ id: 'a2', chatId: 'A', timestamp: 3000 }),
    });
    expect(sortedChats(state).map((c) => c.chatId)).toEqual(['A', 'B']);
  });
});
