import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function ChatbotScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🤖</Text>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>
          Coming Soon!{'\n'}
          Advanced road safety assistance will be available soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.text.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
});