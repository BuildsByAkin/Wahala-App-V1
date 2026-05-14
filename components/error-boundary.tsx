import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

type Props = {
  label?: string;
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const label = this.props.label ?? 'ErrorBoundary';
    console.log(`[${label}] caught error:`, error?.message);
    console.log(`[${label}] stack:`, error?.stack);
    if (info?.componentStack) {
      console.log(`[${label}] componentStack:`, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something broke on this screen</Text>
          <Text style={styles.msg} numberOfLines={6}>
            {this.state.error.message || String(this.state.error)}
          </Text>
          {this.state.error.stack ? (
            <Text style={styles.stack} numberOfLines={20}>
              {this.state.error.stack}
            </Text>
          ) : null}
          <Pressable
            onPress={this.reset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: rs.size(20),
    backgroundColor: Colors.surface.base,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
    marginBottom: rs.size(10),
  },
  msg: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.text.secondary,
    marginBottom: rs.size(14),
  },
  stack: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    marginBottom: rs.size(16),
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.brand,
    paddingHorizontal: rs.size(18),
    paddingVertical: rs.size(12),
    borderRadius: rs.size(12),
  },
  btnText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: Colors.text.onAction,
  },
});
