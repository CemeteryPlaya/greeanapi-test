import { describe, expect, it } from 'vitest';
import type { NotificationBody } from '../api/greenApi';
import { parseNotification } from './notifications';

const incoming: NotificationBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1700000000,
  idMessage: 'msg-1',
  senderData: {
    chatId: '10000000',
    chatName: 'Иван',
    sender: '10000000',
    senderName: 'Иван',
    senderContactName: 'Иван Петров',
    senderPhoneNumber: 79998887766,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет!' },
  },
};

describe('parseNotification', () => {
  it('разбирает входящее текстовое сообщение', () => {
    expect(parseNotification(incoming)).toEqual({
      type: 'message',
      message: {
        id: 'msg-1',
        chatId: '10000000',
        text: 'Привет!',
        direction: 'in',
        timestamp: 1700000000000,
        status: undefined,
      },
      chatTitle: 'Иван Петров',
      phone: '79998887766',
    });
  });

  it('понимает extendedTextMessage', () => {
    const event = parseNotification({
      ...incoming,
      messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'Ссылка' } },
    });
    expect(event?.type === 'message' && event.message.text).toBe('Ссылка');
  });

  it('исходящее с телефона — direction out без номера собеседника', () => {
    const event = parseNotification({ ...incoming, typeWebhook: 'outgoingMessageReceived' });
    expect(event).toMatchObject({
      type: 'message',
      message: { direction: 'out', status: 'sent' },
      chatTitle: 'Иван',
      phone: undefined,
    });
  });

  it('игнорирует нетекстовые сообщения', () => {
    expect(
      parseNotification({ ...incoming, messageData: { typeMessage: 'imageMessage' } }),
    ).toBeNull();
  });

  it('разбирает статус исходящего сообщения', () => {
    expect(
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '10000000',
        idMessage: 'msg-2',
        status: 'read',
      }),
    ).toEqual({ type: 'status', chatId: '10000000', id: 'msg-2', status: 'read' });
  });

  it('WhatsApp: номер собеседника берётся из chatId', () => {
    const event = parseNotification({
      ...incoming,
      senderData: {
        chatId: '79001234567@c.us',
        sender: '79001234567@c.us',
        chatName: 'Иван',
        senderName: 'Иван',
        senderContactName: 'Иван Царевич',
      },
    });
    expect(event).toMatchObject({
      message: { chatId: '79001234567@c.us', direction: 'in' },
      chatTitle: 'Иван Царевич',
      phone: '79001234567',
    });
  });

  it('группа называется по чату, а не по отправителю, и без номера', () => {
    const event = parseNotification({
      ...incoming,
      senderData: {
        chatId: '120363369140947676@g.us',
        sender: '79001234567@c.us',
        chatName: 'Группа',
        senderName: 'Иван',
        senderPhoneNumber: 79001234567,
      },
    });
    expect(event).toMatchObject({ chatTitle: 'Группа', phone: undefined });
  });

  it('Telegram: в исходящих senderPhoneNumber — свой номер, его не берём', () => {
    const event = parseNotification({ ...incoming, typeWebhook: 'outgoingAPIMessageReceived' });
    expect(event).toMatchObject({ phone: undefined });
  });

  it('игнорирует прочие типы уведомлений', () => {
    expect(parseNotification({ typeWebhook: 'stateInstanceChanged' })).toBeNull();
  });
});
