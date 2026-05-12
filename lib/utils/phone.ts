// lib/utils/phone.ts

const NG_DIAL_CODE = '+234';

export function normalizeNigerianPhone(input: string): string | null {
  const trimmed = input.replace(/[\s\-()]/g, '').trim();
  if (!trimmed) return null;

  if (/^\+234\d{10}$/.test(trimmed)) return trimmed;
  if (/^234\d{10}$/.test(trimmed)) return `+${trimmed}`;
  if (/^0\d{10}$/.test(trimmed)) return `${NG_DIAL_CODE}${trimmed.slice(1)}`;
  if (/^\d{10}$/.test(trimmed)) return `${NG_DIAL_CODE}${trimmed}`;

  return null;
}

export function isValidNigerianPhone(input: string): boolean {
  return normalizeNigerianPhone(input) !== null;
}
