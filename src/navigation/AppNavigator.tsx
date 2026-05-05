import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import AuthNavigator from './AuthNavigator';
import UserNavigator from './UserNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createStackNavigator();

function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="UserApp" component={UserNavigator} />
      <Stack.Screen name="AdminApp" component={AdminNavigator} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const role = await AsyncStorage.getItem('user_role');
      if (token && role === 'admin') setInitialRoute('AdminApp');
      else if (token && role === 'user') setInitialRoute('UserApp');
      else setInitialRoute('Auth');
    } catch (e) {
      setInitialRoute('Auth');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center',
                     alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="UserApp" component={UserNavigator} />
        <Stack.Screen name="AdminApp" component={AdminNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
