import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGreenApi,
  GreenApiError,
  instanceHostHint,
  normalizeApiUrl,
  normalizeIdInstance,
} from './greenApi';

const credentials = { platform: 'whatsapp' as const, apiUrl: 'https://api.green-api.com/', idInstance: '1101000001', apiTokenInstance: 'token' };

function mockFetch(body: string, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('normalizeApiUrl', () => {
  it('убирает завершающий слэш и добавляет протокол', () => {
    expect(normalizeApiUrl('https://1103.api.green-api.com/')).toBe('https://1103.api.green-api.com');
    expect(normalizeApiUrl('1103.api.green-api.com')).toBe('https://1103.api.green-api.com');
    expect(normalizeApiUrl('  ')).toBe('https://api.green-api.com');
  });
});

describe('нормализация ввода', () => {
  it('apiUrl: отбрасывает путь и кавычки', () => {
    expect(normalizeApiUrl('"https://7201.api.green-api.com/waInstance7201000001/"')).toBe(
      'https://7201.api.green-api.com',
    );
  });

  it('idInstance: оставляет только цифры', () => {
    expect(normalizeIdInstance(' waInstance7201000001 ')).toBe('7201000001');
  });

  it('подсказывает, если idInstance не с этого сервера', () => {
    expect(instanceHostHint('https://7201.api.green-api.com', '7103000001')).toMatch(/7103/);
    expect(instanceHostHint('https://7201.api.green-api.com', '7201000001')).toBeNull();
    expect(instanceHostHint('https://api.green-api.com', '7103000001')).toBeNull();
  });
});

describe('createGreenApi', () => {
  it('sendMessage отправляет POST с chatId и message', async () => {
    const fetchMock = mockFetch('{"idMessage":"123"}');
    const result = await createGreenApi(credentials).sendMessage('10000000', 'Привет');

    expect(result.idMessage).toBe('123');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.green-api.com/waInstance1101000001/sendMessage/token');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ chatId: '10000000', message: 'Привет' });
  });

  it('receiveNotification возвращает null, если очередь пуста', async () => {
    const fetchMock = mockFetch('null');
    await expect(createGreenApi(credentials).receiveNotification(20)).resolves.toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.green-api.com/waInstance1101000001/receiveNotification/token?receiveTimeout=20',
    );
  });

  it('deleteNotification вызывает DELETE с receiptId', async () => {
    const fetchMock = mockFetch('{"result":true}');
    await createGreenApi(credentials).deleteNotification(42);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.green-api.com/waInstance1101000001/deleteNotification/token/42');
    expect(init.method).toBe('DELETE');
  });

  it('checkAccount передаёт номер числом', async () => {
    const fetchMock = mockFetch('{"exist":true,"chatId":"10000000"}');
    await createGreenApi(credentials).checkAccount('79991234567');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ phoneNumber: 79991234567 });
  });

  it('checkWhatsapp вызывает свой метод', async () => {
    const fetchMock = mockFetch('{"existsWhatsapp":true}');
    await createGreenApi(credentials).checkWhatsapp('79991234567');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.green-api.com/waInstance1101000001/checkWhatsapp/token',
    );
  });

  it('понятная ошибка при неверном токене', async () => {
    mockFetch('', 401);
    const error = await createGreenApi(credentials).getStateInstance().catch((e) => e);
    expect(error).toBeInstanceOf(GreenApiError);
    expect(error.status).toBe(401);
    expect(error.message).toMatch(/apiTokenInstance/);
  });

  it('в ошибке есть адрес запроса без токена', async () => {
    mockFetch('', 404);
    const error = await createGreenApi(credentials).getStateInstance().catch((e) => e);
    expect(error.requestUrl).toBe(
      'https://api.green-api.com/waInstance1101000001/getStateInstance/***',
    );
  });
});
