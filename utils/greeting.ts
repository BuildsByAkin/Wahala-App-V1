// utils/greeting.ts
// Pidgin greeting + dynamic motivational subline for the home screen.
//
// Two axes:
//   • Time of day  → morning / afternoon / evening / night
//   • User mood    → neutral / winning / losing  (last 5 settled bets)
//
// All pools are stable, day-seeded picks so the line is fresh on each new
// day but doesn't flicker mid-session on every re-render. The phrasing was
// drafted with Naija (West African) Pidgin English idioms — short, warm,
// never condescending to a losing streak.
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type Mood = 'neutral' | 'winning' | 'losing';

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

// First-half lead-in. Lands as: "<greeting>, <name>".
// Pool size 3 per slot, kept short so it pairs with any display name.
const GREETINGS: Record<TimeOfDay, readonly string[]> = {
  morning: ['Morning', 'How body this morning', 'Oya, good morning'],
  afternoon: ['Afternoon', 'How the day dey go', 'Wetin dey shake'],
  evening: ['Evening', 'How the day take be', 'Oya, evening don land'],
  night: ['How far', 'Night don fall', 'You still dey waka'],
};

// Subline pools — one row per (timeOfDay × mood).
// Winning lines stay humble (don't inflate ego → bad risk).
// Losing lines stay encouraging (no shame, just composure).
const SUBLINES: Record<TimeOfDay, Record<Mood, readonly string[]>> = {
  morning: {
    neutral: [
      'Today fit be your day',
      'Start with brain, no rush',
      'Make we chop small this morning',
    ],
    winning: [
      'You dey hot — protect your bag',
      'Streak strong, sharp picks only',
      'Cool head, the money go follow',
    ],
    losing: [
      'New day, fresh head — comeback dey load',
      'Brain over emotion. We go bounce back',
      'Small stake, sharp pick. Reset don start',
    ],
  },
  afternoon: {
    neutral: [
      'Smart move pass big move',
      'Pick one gist, drop small stake',
      'Belle full? Make we move',
    ],
    winning: [
      'The day dey favour you — no over-stake',
      'You sabi am, just protect am',
      'Win quietly, plan loudly',
    ],
    losing: [
      'One good call go reset everything',
      'No chase loss — chase value',
      'Cool down. Pick one strong play',
    ],
  },
  evening: {
    neutral: [
      'One last play before night',
      'Cool head dey win evening',
      'Sleep with money for pocket',
    ],
    winning: [
      'Lock am in, end the day winning',
      "Don't gamble back your gain",
      'Close strong, no late tilt',
    ],
    losing: [
      'End the day clean, no chase',
      'Tomorrow dey come — rest small',
      'No revenge bet for night',
    ],
  },
  night: {
    neutral: [
      'Late night plays, sharp eyes',
      'No FOMO, just facts',
      'Quiet money dey for night',
    ],
    winning: [
      'Hot at night — but no greedy',
      'Take am one play at a time',
      'Bank the win, sleep proud',
    ],
    losing: [
      'Sleep on am, attack tomorrow',
      'No chase under blanket',
      'Rest your head, reset your game',
    ],
  },
};

// Stable day index so picks rotate daily without flickering across renders.
export function dailySeed(d: Date = new Date()): number {
  // Tz-naive day bucket — good enough; we only need a stable rotator.
  return Math.floor(d.getTime() / 86_400_000);
}

function pickFrom<T>(pool: readonly T[], seed: number): T {
  // Pool is never empty in our data — but guard so callers can't crash.
  if (pool.length === 0) {
    throw new Error('greeting: empty pool');
  }
  return pool[Math.abs(seed) % pool.length]!;
}

export type GreetingPair = {
  greeting: string;
  subline: string;
  timeOfDay: TimeOfDay;
  mood: Mood;
};

export function getGreetingPair({
  tod,
  mood,
  seed,
}: {
  tod: TimeOfDay;
  mood: Mood;
  seed: number;
}): GreetingPair {
  return {
    greeting: pickFrom(GREETINGS[tod], seed),
    // Offset the subline seed so it doesn't always pair index-0 → index-0.
    subline: pickFrom(SUBLINES[tod][mood], seed + 7),
    timeOfDay: tod,
    mood,
  };
}
