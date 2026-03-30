import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import type { RootStackParamList, MainTabParamList } from './types';
import { useAuthStore } from '../store';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { MapScreen } from '../screens/MapScreen';
import { AreasScreen } from '../screens/AreasScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab icons (simple text for now, can be replaced with icons later)
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? '#2e7d32' : '#757575', fontSize: 20 }}>
      {label}
    </Text>
  );
}

function MainTabs() {
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === 'owner';

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#eef3ed' },
        headerTintColor: '#1a3518',
        tabBarStyle: { backgroundColor: '#eef3ed' },
        tabBarActiveTintColor: '#2e7d32',
        tabBarInactiveTintColor: '#757575',
      }}
    >
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => <TabIcon label="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon label="🗺️" focused={focused} />,
        }}
      />
      {isOwner && (
        <Tab.Screen
          name="Areas"
          component={AreasScreen}
          options={{
            title: 'Areas',
            tabBarIcon: ({ focused }) => <TabIcon label="📍" focused={focused} />,
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
