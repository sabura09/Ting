import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebViewScreen } from '../screens/WebViewScreen';

/**
 * Root navigation setup.
 *
 * Currently only contains the WebView screen, but structured
 * to allow adding native screens alongside it in the future.
 *
 * Example future additions:
 * - Settings screen (native)
 * - Push notification handler screen
 * - Offline fallback screen
 * - Deep link handler
 */

export type RootStackParamList = {
  Main: undefined;
  // Future native screens can be added here:
  // Settings: undefined;
  // Offline: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id="RootStack"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#030712' },
        }}
      >
        <Stack.Screen
          name="Main"
          component={WebViewScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
