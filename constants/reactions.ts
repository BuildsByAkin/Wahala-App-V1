// constants/reactions.ts
// Single source of truth for the allowed reaction emoji set. Mirrors the
// server-side enum (BACKEND.md §10) — anything outside this list returns 400
// from POST /markets/:id/reactions, so the picker MUST stay in lockstep.
export const ALLOWED_REACTIONS = [
  '🔥',
  '😂',
  '😱',
  '💀',
  '👀',
  '🙏',
  '💯',
  '🇳🇬',
] as const;

export type ReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

export function isAllowedReaction(value: string): value is ReactionEmoji {
  return (ALLOWED_REACTIONS as readonly string[]).includes(value);
}
