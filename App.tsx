import { useEffect } from 'react';
import { View } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { handleOAuthCallback } from './src/services/fxaService';
import { BrowserScreen } from './src/screens/BrowserScreen';
import { NewTabScreen } from './src/screens/NewTabScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { getActiveTab, useBrowserStore } from './src/store/browserStore';
import { ThemeProvider, isColorDark, useTheme } from './src/theme';

type RootStackParams = {
  Browser: undefined;
  Settings: undefined;
  NewTab: undefined;
};

const Stack = createStackNavigator<RootStackParams>();

const AppNavigator = () => {
  const themePreference = useBrowserStore((state) => state.themePreference);
  const isTransparentMode = useBrowserStore((state) => state.isTransparentMode);

  return (
    <ThemeProvider preference={themePreference} isTransparentMode={isTransparentMode}>
      <NavigationContainer>
        <ThemedStack />
      </NavigationContainer>
    </ThemeProvider>
  );
};

const ThemedStack = () => {
  const { mode } = useTheme();
  const useWebsiteThemeColor = useBrowserStore((state) => state.useWebsiteThemeColor);
  const activeTab = useBrowserStore(getActiveTab);

  const statusBarStyle = (() => {
    if (useWebsiteThemeColor && activeTab?.themeColor) {
      return isColorDark(activeTab.themeColor) ? ('light' as const) : ('dark' as const);
    }
    return mode === 'dark' ? ('light' as const) : ('dark' as const);
  })();

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="Browser"
          children={({ navigation }) => (
            <BrowserScreen onOpenSettings={() => navigation.navigate('Settings')} />
          )}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="NewTab"
          children={({ navigation }) => (
            <NewTabScreen onDone={() => navigation.navigate('Browser')} />
          )}
        />
      </Stack.Navigator>
    </>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.path === 'fxa-oauth') {
        const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : '';
        handleOAuthCallback(code).catch(() => undefined);
      }
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0d0f14' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
