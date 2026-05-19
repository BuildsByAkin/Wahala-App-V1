// hooks/useDramaMode.ts
// Drama Mode = the final hour before a market closes. Returns a ticking
// `secondsLeft` so consumers (CountdownClock, DramaMode wrapper, haptic
// triggers) can derive their own state without each one running a setInterval.
//
// The hook ticks every 250ms while inside the final hour, and every 5s
// otherwise — so a closed/scheduled market doesn't pay the wake-up cost.
import { useEffect, useState } from 'react';

const DRAMA_WINDOW_SECONDS = 60 * 60; // 1 hour

export interface DramaModeState {
  /** True when the market is open and `<= 1h` from close. */
  isDrama: boolean;
  /** Whole seconds remaining until close. Floored at 0. */
  secondsLeft: number;
  /** True when the market has already passed its close time. */
  hasClosed: boolean;
}

export function useDramaMode(
  closesAt: string | undefined,
  marketStatus?: string
): DramaModeState {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!closesAt) return;
    const target = new Date(closesAt).getTime();
    if (Number.isNaN(target)) return;

    const remaining = (target - Date.now()) / 1000;
    const inDrama = remaining > 0 && remaining <= DRAMA_WINDOW_SECONDS;
    const interval = inDrama ? 250 : 5000;

    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [closesAt, now]);

  if (!closesAt) {
    return { isDrama: false, secondsLeft: 0, hasClosed: false };
  }
  const target = new Date(closesAt).getTime();
  if (Number.isNaN(target)) {
    return { isDrama: false, secondsLeft: 0, hasClosed: false };
  }

  const diffSec = Math.floor((target - now) / 1000);
  const secondsLeft = Math.max(0, diffSec);
  const hasClosed = diffSec <= 0 || marketStatus === 'locked' || marketStatus === 'resolved';
  const isDrama =
    !hasClosed &&
    secondsLeft <= DRAMA_WINDOW_SECONDS &&
    (marketStatus === 'open' || marketStatus === 'scheduled' || marketStatus === undefined);

  return { isDrama, secondsLeft, hasClosed };
}
