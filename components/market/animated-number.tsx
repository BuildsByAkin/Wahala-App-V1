import { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

type Props = {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
};

export function AnimatedNumber({
  value,
  suffix = '',
  decimals = 0,
  duration = 700,
  delay = 0,
  style,
}: Props) {
  const [display, setDisplay] = useState<number>(value);
  const fromRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const targetRef = useRef<number>(value);

  useEffect(() => {
    const from = fromRef.current;
    targetRef.current = value;

    let cancelled = false;

    const start = () => {
      startedAtRef.current = Date.now();

      const tick = () => {
        if (cancelled) return;
        const elapsed = Date.now() - startedAtRef.current;
        const t = Math.min(1, elapsed / Math.max(1, duration));
        const eased = 1 - Math.pow(1 - t, 3);
        const current = from + (targetRef.current - from) * eased;
        setDisplay(current);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          fromRef.current = targetRef.current;
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const timeoutId = setTimeout(start, Math.max(0, delay));

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, delay]);

  return (
    <Text style={style} allowFontScaling={false}>
      {display.toFixed(decimals)}
      {suffix}
    </Text>
  );
}
