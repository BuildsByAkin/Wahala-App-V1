// hooks/useReducedMotion.ts
// Single source of truth for "is the user asking for less motion". Used by
// every motion primitive (springs collapse to `time.fast`, loops freeze,
// Lottie is swapped for a static glyph). Listens to system changes so the
// app reacts immediately when the user toggles the setting from Control Centre.
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduced(v);
      })
      .catch(() => {
        /* noop — fall through to false */
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (mounted) setReduced(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
