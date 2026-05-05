import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

// Import admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminAlertsScreen from '../screens/admin/AdminAlertsScreen';
import AdminMapScreen from '../screens/admin/AdminMapScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const icons = {
  Dashboard: '📊',
  Users: '👥',
  Reports: '⚠️',
  Analytics: '📈',
  Alerts: '🚨',
  Map: '🗺',
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
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Users"
        component={AdminUsersScreen}
        options={{
          tabBarLabel: 'Users',
        }}
      />
      <Tab.Screen
        name="Reports"
        component={AdminReportsScreen}
        options={{
          tabBarLabel: 'Reports',
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AdminAnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AdminAlertsScreen}
        options={{
          tabBarLabel: 'Alerts',
        }}
      />
      <Tab.Screen
        name="Map"
        component={AdminMapScreen}
        options={{
          tabBarLabel: 'Map',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminTabs" component={TabNavigator} />
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
    fontSize: 20,
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
    fontWeight: typography.fontWeight.bold,
  },
});