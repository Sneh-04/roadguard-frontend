import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function SplashScreen({ navigation }: any) {
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('UserApp');
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, {
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim
      }]}>
        <Text style={styles.icon}>🛡️</Text>
        <Text style={styles.title}>RoadGuard-AI</Text>
        <Text style={styles.subtitle}>Intelligent Road Safety</Text>
        <Text style={styles.version}>Powered by AI • Edge-Cloud Fusion</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { alignItems: 'center' },
  icon: { fontSize: 80, marginBottom: 24 },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#06B6D4',
    marginBottom: 8,
  },
  version: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
  },
});