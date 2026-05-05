import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

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
    setTimeout(() => checkAuthAndLogin(), 2000);
  }, []);

  const checkAuthAndLogin = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const role = await AsyncStorage.getItem('user_role');
      if (token && role) {
        navigateByRole(role);
        return;
      }
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@roadguard.com',
        password: 'Admin@123',
      });
      const { token: newToken, role: newRole, username } = response.data;
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('user_role', newRole);
      await AsyncStorage.setItem('username', username);
      navigateByRole(newRole);
    } catch (e) {
      navigation.replace('Login');
    }
  };

  const navigateByRole = (role: string) => {
    if (role === 'admin') {
      navigation.reset({ index: 0, routes: [{ name: 'AdminApp' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'UserApp' }] });
    }
  };

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