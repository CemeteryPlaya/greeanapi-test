import { useState, type FormEvent } from 'react';
import type { GreenApi } from '../api/greenApi';
import { normalizePhone } from '../lib/phone';
import { ChatLookupError, PLATFORMS, type NewChat } from '../lib/platforms';
import type { Platform } from '../types';
import { CloseIcon } from './icons';

interface NewChatFormProps {
  api: GreenApi;
  platform: Platform;
  onCreate: (chat: NewChat) => void;
  onCancel: () => void;
}

export function NewChatForm({ api, platform, onCreate, onCancel }: NewChatFormProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const phone = normalizePhone(value);
    if (!phone) {
      setError('Введите номер в международном формате, например +7 999 123-45-67');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      onCreate(await PLATFORMS[platform].resolveChat(api, phone));
    } catch (err) {
      setError(err instanceof ChatLookupError ? err.message : 'Не удалось создать чат');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="new-chat" onSubmit={handleSubmit}>
      <div className="new-chat__header">
        <span className="new-chat__title">Новый чат</span>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Закрыть">
          <CloseIcon />
        </button>
      </div>
      <input
        className="field__input"
        type="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Номер получателя в ${PLATFORMS[platform].label}`}
        aria-label="Номер телефона получателя"
        autoComplete="tel"
        autoFocus
      />
      {error && (
        <p className="new-chat__error" role="alert">
          {error}
        </p>
      )}
      <button className="button button--primary" type="submit" disabled={loading || !value.trim()}>
        {loading ? 'Ищем…' : 'Создать чат'}
      </button>
    </form>
  );
}
