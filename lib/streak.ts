// lib/streak.ts
// Daily streak tracker (v2 Pillar 1 — Daily Wahala).
//
// A streak is the count of consecutive days the user has taken a stance
// (placed a bet). The rules:
//   - Two stances on the same day count as one.
//   - Missing a day resets the streak to 0 on next read.
//   - The stance for "today" must land before midnight in the *device*
//     locale; we use the device clock deliberately so a user in Lagos
//     who travels does not get a "missed day" surprise.
//
// Persistence: expo-secure-store (the only KV available in this project).
// SecureStore is encrypted-at-rest, which is overkill for a streak counter
// but free and consistent with how we already persist redux state.
//
// Backend sync: a `syncStreak` hook is exposed for a future PUT /me/streak
// integration. Today it's a no-op — the home reads the local value and the
// backend is the source of truth only once we ship the endpoint.

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'wahala.streak.v1';

export interface StreakState {
  count: number;
  // YYYY-MM-DD in the device's local timezone, or null if never staked.
  lastStanceDate: string | null;
}

const EMPTY_STATE: StreakState = { count: 0, lastStanceDate: null };

// In-memory cache so the home doesn't flicker on remount.
let cache: StreakState | null = null;

// Lightweight pubsub. The React hook subscribes on mount; mutations broadcast.
type Listener = (state: StreakState) => void;
const listeners = new Set<Listener>();

function emit(next: StreakState) {
  cache = next;
  for (const l of listeners) l(next);
}

export function subscribeStreak(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- date helpers ---------------------------------------------------------

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(now: Date = new Date()): string {
  return toLocalISODate(now);
}

function yesterdayISO(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return toLocalISODate(d);
}

/**
 * Normalize the persisted state against "now". If the last stance was older
 * than yesterday, the streak is considered broken and the count is zeroed.
 */
export function normalize(state: StreakState, now: Date = new Date()): StreakState {
  if (!state.lastStanceDate || state.count <= 0) {
    return state.count === 0 && state.lastStanceDate === null ? state : EMPTY_STATE;
  }
  const today = todayISO(now);
  const yest = yesterdayISO(now);
  if (state.lastStanceDate === today || state.lastStanceDate === yest) {
    return state;
  }
  // Missed at least one day → reset.
  return EMPTY_STATE;
}

// --- persistence ----------------------------------------------------------

async function readRaw(): Promise<StreakState> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    if (typeof parsed.count !== 'number') return EMPTY_STATE;
    return {
      count: Math.max(0, Math.floor(parsed.count)),
      lastStanceDate: parsed.lastStanceDate ?? null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

async function writeRaw(state: StreakState): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* noop — streak is non-critical, fail silent */
  }
}

/** Read the current streak, normalizing for missed-day reset. */
export async function loadStreak(now: Date = new Date()): Promise<StreakState> {
  const raw = await readRaw();
  const normalized = normalize(raw, now);
  if (normalized !== raw) {
    await writeRaw(normalized);
  }
  cache = normalized;
  emit(normalized);
  return normalized;
}

/** Synchronous getter for callers that just need the last-known value. */
export function getCachedStreak(): StreakState {
  return cache ?? EMPTY_STATE;
}

/**
 * Mark "the user took a stance today". Idempotent within a calendar day.
 * Returns the new state.
 */
export async function markStanceTaken(now: Date = new Date()): Promise<StreakState> {
  const current = normalize(await readRaw(), now);
  const today = todayISO(now);
  const yest = yesterdayISO(now);

  let next: StreakState;
  if (current.lastStanceDate === today) {
    // Already counted today — no change.
    next = current;
  } else if (current.lastStanceDate === yest) {
    next = { count: current.count + 1, lastStanceDate: today };
  } else {
    // Either fresh start or streak was already broken.
    next = { count: 1, lastStanceDate: today };
  }

  if (next !== current) {
    await writeRaw(next);
  }
  emit(next);
  return next;
}

/** Wipe the streak. Used on logout. */
export async function resetStreak(): Promise<void> {
  await writeRaw(EMPTY_STATE);
  emit(EMPTY_STATE);
}

/**
 * BACKEND.md §11.3 — reconcile the local SecureStore copy with the
 * authoritative server value returned by /me. Called from the auth slice
 * mirror (and from useMe.onSuccess) so the device count never drifts.
 *
 * Strategy: server wins whenever it returns a defined `dailyStreak`. We
 * keep the local cache around as a fallback for cold-start renders and
 * for older backends that don't yet return the field.
 */
export async function reconcileWithServer(params: {
  dailyStreak: number | null | undefined;
  dailyStreakLastDay: string | null | undefined;
}): Promise<StreakState> {
  if (params.dailyStreak === undefined || params.dailyStreak === null) {
    // Server didn't return a value — leave the local cache alone.
    return cache ?? (await loadStreak());
  }
  const next: StreakState = {
    count: Math.max(0, Math.floor(params.dailyStreak)),
    lastStanceDate: params.dailyStreakLastDay ?? null,
  };
  await writeRaw(next);
  emit(next);
  return next;
}
