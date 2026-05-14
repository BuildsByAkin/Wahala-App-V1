// components/market/probability-bar.tsx
// One calm horizontal bar — the source of truth for "where the market sits".
// For binary markets we render the two sides' percentages above the bar in
// their identity colors. For n-ary the bar splits proportionally and the
// percentages live on the choice cards themselves.
//
// On a locked / resolved market the bar is rendered identically (the values
// are already frozen server-side); the StatusPill above the screen
// communicates that the numbers are final.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import type { DetailOutcome } from '@/hooks/useMarket';

type Props = {
  outcomes: DetailOutcome[];
  poolExists: boolean;
  // Resolved side colors (binary scheme or n-ary palette), aligned by index.
  colors: string[];
  // When true, hide the percentage labels above the bar (n-ary cards already
  // show the percent inside themselves).
  hideLabels?: boolean;
};

export function ProbabilityBar({
  outcomes,
  poolExists,
  colors,
  hideLabels = false,
}: Props) {
  const totalPct = outcomes.reduce((s, o) => s + Math.max(0, o.sharePercent), 0);
  const showLabels = !hideLabels && outcomes.length === 2;

  return (
    <View>
      {showLabels ? (
        <View style={styles.labels}>
          <View style={styles.label}>
            <Text style={[styles.pct, { color: colors[0] ?? Colors.text.primary }]}>
              {poolExists ? `${outcomes[0]?.sharePercent ?? 0}%` : '—'}
            </Text>
            <Text style={styles.side} numberOfLines={1}>
              {outcomes[0]?.label ?? ''}
            </Text>
          </View>
          <View style={[styles.label, styles.labelRight]}>
            <Text style={styles.side} numberOfLines={1}>
              {outcomes[1]?.label ?? ''}
            </Text>
            <Text style={[styles.pct, { color: colors[1] ?? Colors.text.primary }]}>
              {poolExists ? `${outcomes[1]?.sharePercent ?? 0}%` : '—'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.track}>
        {!poolExists || totalPct <= 0
          ? null
          : outcomes.map((o, i) => {
              const pct = Math.max(0, o.sharePercent);
              if (pct <= 0) return null;
              return (
                <View
                  key={o.id}
                  style={{
                    flex: pct,
                    backgroundColor: colors[i] ?? Colors.text.tertiary,
                  }}
                />
              );
            })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: rs.size(8),
    gap: rs.size(12),
  },
  label: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: rs.size(8),
    flexShrink: 1,
  },
  labelRight: { justifyContent: 'flex-end' },
  pct: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
  },
  side: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  track: {
    height: rs.size(8),
    borderRadius: rs.size(999),
    backgroundColor: Colors.surface.muted,
    overflow: 'hidden',
    flexDirection: 'row',
  },
});
