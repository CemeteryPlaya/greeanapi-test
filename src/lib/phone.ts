/**
 * Приводит введённый номер к виду «только цифры, с кодом страны».
 * Российский формат 8XXXXXXXXXX заменяется на 7XXXXXXXXXX.
 * Возвращает null, если номер не похож на международный (10–15 цифр).
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** 79991234567 → +7 999 123-45-67; прочие номера — просто с «+». */
export function formatPhone(digits: string): string {
  const ru = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits);
  if (ru) return `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}`;
  return `+${digits}`;
}
