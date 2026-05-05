import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

// Import screens
import HomeScreen from '../screens/user/HomeScreen';
import LiveMapScreen from '../screens/user/LiveMapScreen';
import MonitorScreen from '../screens/user/MonitorScreen';
import ChatbotScreen from '../screens/user/ChatbotScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import HazardHistoryScreen from '../screens/user/HazardHistoryScreen';
import WeatherScreen from '../screens/user/WeatherScreen';
import HazardReportScreen from '../screens/user/HazardReportScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const icons = {
  Home: '🏠',
  'Live Map': '🗺',
  Monitor: '📡',
  Assistant: '🤖',
  Profile: '👤',
};

const TabIcon = ({ name, focused }: { name: keyof typeof icons; focused: boolean }) => {

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name]}
      </Text>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
};

const TabLabel = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={[styles.label, focused && styles.labelFocused]}>
    {name}
  </Text>
);

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name as keyof typeof icons} focused={focused} />
        ),
        tabBarLabel: ({ focused }) => (
          <TabLabel name={route.name} focused={focused} />
        ),
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Live Map"
        component={LiveMapScreen}
        options={{
          tabBarLabel: 'Live Map',
        }}
      />
      <Tab.Screen
        name="Monitor"
        component={MonitorScreen}
        options={{
          tabBarLabel: 'Monitor',
        }}
      />
      <Tab.Screen
        name="Assistant"
        component={ChatbotScreen}
        options={{
          tabBarLabel: 'Assistant',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function UserNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="HazardHistory" component={HazardHistoryScreen} />
      <Stack.Screen name="HazardReport" component={HazardReportScreen} />
      <Stack.Screen name="Monitor" component={MonitorScreen} />
      <Stack.Screen name="Weather" component={WeatherScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 65,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: {
    fontSize: 24,
    color: colors.textMuted,
  },
  iconFocused: {
    color: colors.accent,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 30,
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  label: {
    ...typography.text.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  labelFocused: {
    color: colors.accent,
    fontWeight: typography.fontWeight.medium,
  },
});