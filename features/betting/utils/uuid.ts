// features/betting/utils/uuid.ts
// Lightweight UUID v4 used purely as a client-side idempotency key for /bets.
// Cryptographic strength is not required; collision risk at app scale is nil.
// Prefer the platform crypto.randomUUID when available (Hermes 0.74+ exposes it).

type CryptoLike = { randomUUID?: () => string };

export function uuidv4(): string {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (c?.randomUUID) {
    try {
      return c.randomUUID();
    } catch {
      // fall through to manual implementation
    }
  }
  // RFC 4122 v4 fallback.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
