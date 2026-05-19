// hooks/useHomeGreeting.ts
// Composes the home screen greeting: pidgin lead-in + mood-aware subline.
//
// Mood is derived from the last few SETTLED bets so the line responds to
// recent performance (top winners get a humble nudge, recent losers get a
// composure nudge). The thresholds are intentionally conservative — we
// require a clear lean (≥ 2 net) before flipping out of `neutral` so a
// single bad day doesn't drown a balanced player in losing-streak copy.
import { useMemo } from 'react';

import { useAuth } from '@/features/auth';
import { useMyBets } from '@/features/betting';
import {
  dailySeed,
  getGreetingPair,
  getTimeOfDay,
  type GreetingPair,
  type Mood,
} from '@/utils/greeting';

const SAMPLE_SIZE = 5;
const STREAK_THRESHOLD = 2;

export function useHomeGreeting(): GreetingPair {
  const { isAuthenticated } = useAuth();

  // Two tiny queries — both cached 30s by useMyBets, so this is effectively
  // free after the first home render. We deliberately don't fetch on the
  // welcome / auth flows.
  const won = useMyBets({
    status: 'won',
    limit: SAMPLE_SIZE,
    enabled: isAuthenticated,
  });
  const lost = useMyBets({
    status: 'lost',
    limit: SAMPLE_SIZE,
    enabled: isAuthenticated,
  });

  return useMemo<GreetingPair>(() => {
    const tod = getTimeOfDay();
    const seed = dailySeed();

    let mood: Mood = 'neutral';
    if (isAuthenticated) {
      const w = won.bets.length;
      const l = lost.bets.length;
      if (w >= l + STREAK_THRESHOLD) mood = 'winning';
      else if (l >= w + STREAK_THRESHOLD) mood = 'losing';
    }

    return getGreetingPair({ tod, mood, seed });
  }, [isAuthenticated, won.bets.length, lost.bets.length]);
}
