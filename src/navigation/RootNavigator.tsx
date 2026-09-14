import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { GenderScreen } from '../screens/GenderScreen';
import { AgeScreen } from '../screens/AgeScreen';
import { SelfieScreen } from '../screens/SelfieScreen';
import { FreeResultScreen } from '../screens/FreeResultScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { PaidReportScreen } from '../screens/PaidReportScreen';
import { colors } from '../theme/tiers';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Gender"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Gender" component={GenderScreen} />
        <Stack.Screen name="Age" component={AgeScreen} />
        <Stack.Screen name="Selfie" component={SelfieScreen} />
        <Stack.Screen
          name="FreeResult"
          component={FreeResultScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="PaidReport"
          component={PaidReportScreen}
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
