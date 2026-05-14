// components/market/diagonal-hairlines.tsx
// Repeating 45° hairline pattern used to mark a CLOSED / LOCKED market card.
// Distinct from a disabled state: borders + text remain visible, the pattern
// just signals "this surface is intentionally frozen".
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

type Props = {
  color?: string;
  // Base opacity for the lines (0–1). Pattern reads as a watermark, not a fill.
  opacity?: number;
  // Spacing between adjacent hairlines, in dp.
  step?: number;
  // Optional border-radius so the pattern clips against a rounded card.
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function DiagonalHairlines({
  color = '#FFFFFF',
  opacity = 0.04,
  step = 8,
  borderRadius = 0,
  style,
}: Props) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="dh"
            patternUnits="userSpaceOnUse"
            width={step}
            height={step}
            patternTransform="rotate(45)"
          >
            <Path d={`M0 0 L0 ${step}`} stroke={color} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#dh)" opacity={opacity} />
      </Svg>
    </View>
  );
}
