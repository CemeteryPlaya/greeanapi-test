import { useState, type FormEvent } from 'react';
import {
  createGreenApi,
  DEFAULT_API_URL,
  GreenApiError,
  instanceHostHint,
  normalizeApiUrl,
  normalizeIdInstance,
} from '../api/greenApi';
import { isPlatform, PLATFORM_LIST, PLATFORMS } from '../lib/platforms';
import type { Credentials, Platform } from '../types';

const stateHints = (platform: Platform): Record<string, string> => ({
  notAuthorized: `Инстанс не авторизован — привяжите аккаунт ${PLATFORMS[platform].label} в личном кабинете GREEN-API`,
  blocked: 'Инстанс заблокирован',
  starting: 'Инстанс запускается, попробуйте через минуту',
  yellowCard: 'Отправка сообщений с инстанса временно приостановлена',
});

// Автозаполнение из .env.local (см. .env.example) — только в dev:
// в production-сборку токены попасть не должны
const env: Record<string, string | undefined> = import.meta.env.DEV ? import.meta.env : {};

interface InstanceFields {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

/** Данные инстанса из VITE_GREEN_API_WHATSAPP_* / VITE_GREEN_API_TELEGRAM_* */
function devInstance(platform: Platform): InstanceFields | null {
  const prefix = `VITE_GREEN_API_${platform.toUpperCase()}`;
  const idInstance = env[`${prefix}_ID_INSTANCE`];
  if (!idInstance) return null;
  return {
    apiUrl: env[`${prefix}_URL`] || DEFAULT_API_URL,
    idInstance,
    apiTokenInstance: env[`${prefix}_TOKEN`] ?? '',
  };
}

const initialPlatform: Platform = isPlatform(env.VITE_GREEN_API_PLATFORM)
  ? env.VITE_GREEN_API_PLATFORM
  : 'whatsapp';

interface LoginError {
  message: string;
  hint?: string | null;
  requestUrl?: string;
}

interface LoginScreenProps {
  onLogin: (credentials: Credentials) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const preset = devInstance(initialPlatform);
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [apiUrl, setApiUrl] = useState(preset?.apiUrl ?? DEFAULT_API_URL);
  const [idInstance, setIdInstance] = useState(preset?.idInstance ?? '');
  const [apiTokenInstance, setApiTokenInstance] = useState(preset?.apiTokenInstance ?? '');
  const [error, setError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);

  function selectPlatform(next: Platform) {
    setPlatform(next);
    setError(null);
    // у WhatsApp и Telegram разные инстансы — подставляем свой набор, если он задан
    const fields = devInstance(next);
    if (!fields) return;
    setApiUrl(fields.apiUrl);
    setIdInstance(fields.idInstance);
    setApiTokenInstance(fields.apiTokenInstance);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const credentials: Credentials = {
      platform,
      apiUrl: normalizeApiUrl(apiUrl),
      idInstance: normalizeIdInstance(idInstance),
      apiTokenInstance: apiTokenInstance.trim(),
    };

    setLoading(true);
    setError(null);
    try {
      const state = await createGreenApi(credentials).getStateInstance();
      if (state?.stateInstance !== 'authorized') {
        const status = state?.stateInstance ?? 'unknown';
        setError({ message: stateHints(platform)[status] ?? `Инстанс в состоянии «${status}»` });
        return;
      }
      onLogin(credentials);
    } catch (err) {
      if (err instanceof GreenApiError) {
        setError({
          message: err.message,
          hint: err.status === 404 ? instanceHostHint(credentials.apiUrl, credentials.idInstance) : null,
          requestUrl: err.requestUrl,
        });
      } else {
        setError({ message: 'Не удалось подключиться к GREEN-API' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__logo" aria-hidden="true">
          <img src="./favicon.svg" alt="" width={56} height={56} />
        </div>
        <h1 className="login__title">Вход в чат</h1>
        <p className="login__subtitle">
          Введите параметры инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета GREEN-API
          </a>
        </p>

        <div className="segmented" role="radiogroup" aria-label="Мессенджер">
          {PLATFORM_LIST.map((value) => (
            <label
              key={value}
              className={`segmented__item${platform === value ? ' segmented__item--active' : ''}`}
            >
              <input
                type="radio"
                name="platform"
                value={value}
                checked={platform === value}
                onChange={() => selectPlatform(value)}
              />
              {PLATFORMS[value].label}
            </label>
          ))}
        </div>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            autoComplete="username"
            placeholder="1101000001"
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            autoComplete="current-password"
            placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd412345"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">apiUrl</span>
          <input
            className="field__input"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            inputMode="url"
            placeholder={DEFAULT_API_URL}
          />
        </label>

        {error && (
          <div className="login__error" role="alert">
            <p>{error.message}</p>
            {error.hint && <p className="login__error-hint">{error.hint}</p>}
            {error.requestUrl && <code className="login__error-url">{error.requestUrl}</code>}
          </div>
        )}

        <button className="button button--primary" type="submit" disabled={loading}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
