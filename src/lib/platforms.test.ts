import { describe, expect, it, vi } from 'vitest';
import { GreenApiError, type GreenApi } from '../api/greenApi';
import { chatReducer, initialChatState } from '../store/chatReducer';
import { parseNotification } from './notifications';
import { ChatLookupError, PLATFORMS } from './platforms';

function fakeApi(overrides: Partial<GreenApi>): GreenApi {
  return overrides as GreenApi;
}

describe('WhatsApp', () => {
  const { resolveChat } = PLATFORMS.whatsapp;

  it('адресует чат номером@c.us, даже если checkWhatsapp вернул lid', async () => {
    const api = fakeApi({
      checkWhatsapp: vi.fn().mockResolvedValue({ existsWhatsapp: true, chatId: '123456789012345@lid' }),
    });
    await expect(resolveChat(api, '79991234567')).resolves.toEqual({
      chatId: '79991234567@c.us',
      title: '+7 999 123-45-67',
      phone: '79991234567',
    });
  });

  it('сообщает, что у номера нет WhatsApp', async () => {
    const api = fakeApi({ checkWhatsapp: vi.fn().mockResolvedValue({ existsWhatsapp: false }) });
    await expect(resolveChat(api, '79991234567')).rejects.toThrow(ChatLookupError);
  });

  it('при сбое проверки всё равно создаёт чат по номеру', async () => {
    const api = fakeApi({ checkWhatsapp: vi.fn().mockRejectedValue(new GreenApiError('limit', 429)) });
    await expect(resolveChat(api, '79991234567')).resolves.toMatchObject({ chatId: '79991234567@c.us' });
  });

  it('неверный токен — ошибка для пользователя', async () => {
    const api = fakeApi({
      checkWhatsapp: vi.fn().mockRejectedValue(new GreenApiError('Неверный токен', 401)),
    });
    await expect(resolveChat(api, '79991234567')).rejects.toThrow('Неверный токен');
  });

  it('ответ собеседника попадает в созданный чат', async () => {
    const api = fakeApi({ checkWhatsapp: vi.fn().mockResolvedValue({ existsWhatsapp: true }) });
    const chat = await resolveChat(api, '79991234567');
    let state = chatReducer(initialChatState, { type: 'chatOpened', ...chat });

    const event = parseNotification({
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1700000000,
      idMessage: 'ABC',
      senderData: { chatId: '79991234567@c.us', senderName: 'Иван' },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Ответ' } },
    });
    if (event?.type !== 'message') throw new Error('ожидалось сообщение');
    state = chatReducer(state, {
      type: 'messageReceived',
      message: event.message,
      chatTitle: event.chatTitle,
      phone: event.phone,
    });

    expect(state.chats).toHaveLength(1);
    expect(state.messages['79991234567@c.us'].map((m) => m.text)).toEqual(['Ответ']);
  });
});

describe('Telegram', () => {
  const { resolveChat } = PLATFORMS.telegram;

  it('берёт числовой chatId из checkAccount', async () => {
    const api = fakeApi({
      checkAccount: vi.fn().mockResolvedValue({ exist: true, chatId: '10000000', username: '@ivan' }),
    });
    await expect(resolveChat(api, '79991234567')).resolves.toMatchObject({
      chatId: '10000000',
      username: '@ivan',
    });
  });

  it('сообщает, что у номера нет Telegram', async () => {
    const api = fakeApi({ checkAccount: vi.fn().mockResolvedValue({ exist: false, chatId: '' }) });
    await expect(resolveChat(api, '79991234567')).rejects.toThrow('Telegram');
  });

  it('при сбое проверки создаёт чат по номеру@c.us', async () => {
    const api = fakeApi({ checkAccount: vi.fn().mockRejectedValue(new GreenApiError('down', 500)) });
    await expect(resolveChat(api, '79991234567')).resolves.toMatchObject({ chatId: '79991234567@c.us' });
  });
});
