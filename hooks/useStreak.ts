// hooks/useStreak.ts
// React binding around lib/streak.ts. Subscribes to the in-memory cache so
// any consumer (HeaderBar, RecordHero, etc.) re-renders when the count
// changes. Reads from SecureStore on mount.
import { useEffect, useState } from 'react';

import {
  getCachedStreak,
  loadStreak,
  subscribeStreak,
  type StreakState,
} from '@/lib/streak';

export function useStreak(): StreakState {
  const [state, setState] = useState<StreakState>(() => getCachedStreak());

  useEffect(() => {
    let mounted = true;
    void loadStreak().then((s) => {
      if (mounted) setState(s);
    });
    const unsub = subscribeStreak((s) => setState(s));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return state;
}
