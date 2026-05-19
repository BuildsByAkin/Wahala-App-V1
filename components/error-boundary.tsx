import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

type Props = {
  label?: string;
  children: React.ReactNode;
};

type State = {
  error: Error | null;
  componentStack?: string | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const label = this.props.label ?? 'ErrorBoundary';
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[${label}] caught error: ${error?.name ?? 'Error'}: ${error?.message}`);
    if (error?.stack) console.log(`[${label}] stack:\n` + error.stack);
    if (info?.componentStack) {
      console.log(`[${label}] componentStack:` + info.componentStack);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.setState({ componentStack: info?.componentStack ?? null });
  }

  reset = () => {
    this.setState({ error: null, componentStack: null });
  };

  render() {
    if (this.state.error) {
      const label = this.props.label ?? 'ErrorBoundary';
      return (
        <ScrollView style={styles.wrap} contentContainerStyle={styles.wrapContent}>
          <Text style={styles.title}>[{label}] crashed</Text>
          <Text style={styles.msg} selectable>
            {this.state.error.message || String(this.state.error)}
          </Text>
          {this.state.error.stack ? (
            <Text style={styles.stack} selectable>
              {this.state.error.stack}
            </Text>
          ) : null}
          {this.state.componentStack ? (
            <Text style={styles.stack} selectable>
              componentStack:{this.state.componentStack}
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
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.surface.base,
  },
  wrapContent: {
    padding: rs.size(20),
    paddingTop: rs.size(60),
    paddingBottom: rs.size(60),
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
