import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#06B6D4',
    secondary: '#3B82F6',
    background: '#0F172A',
    surface: '#1E293B',
  },
};

export default function App() {
  useEffect(() => {
    LogBox.ignoreAllLogs(true);

    const globalHandler = (error: Error, isFatal?: boolean) => {
      console.error('Global error caught:', error, { isFatal });
      // Do not rethrow so Expo red-box is suppressed in Expo Go.
    };

    if ((global as any).ErrorUtils?.setGlobalHandler) {
      (global as any).ErrorUtils.setGlobalHandler(globalHandler);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <ErrorBoundary>
            <StatusBar style="light" backgroundColor="#0F172A" />
            <AppNavigator />
          </ErrorBoundary>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
