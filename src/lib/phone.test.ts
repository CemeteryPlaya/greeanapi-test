import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('оставляет только цифры', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567');
  });

  it('заменяет российскую 8 на 7', () => {
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567');
  });

  it('не трогает другие страны', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('442079460958');
  });

  it('отклоняет слишком короткие и длинные номера', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('1234567890123456')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('formatPhone', () => {
  it('форматирует российский номер', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67');
  });

  it('прочие номера показывает с плюсом', () => {
    expect(formatPhone('442079460958')).toBe('+442079460958');
  });
});
