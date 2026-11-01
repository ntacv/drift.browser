import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import appConfig from '../../../app.json';
import { useTheme } from '../../theme';

const APP_WEBSITE_URL = 'https://drift-browser.vercel.app/';

export const AppInfoFooter = () => {
  const { theme } = useTheme();
  const appName = Constants.expoConfig?.name ?? appConfig.expo.name;
  const appVersion = Constants.expoConfig?.version ?? appConfig.expo.version;

  return (
    <View style={styles.footer}>
      <Text style={[styles.appName, { color: theme.text }]}>{appName}</Text>
      <Text style={[styles.version, { color: theme.text3 }]}>v{appVersion}</Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={APP_WEBSITE_URL}
        style={styles.websiteLink}
        onPress={() => {
          void Linking.openURL(APP_WEBSITE_URL).catch((error) => {
            console.warn('Unable to open Drift website', error);
          });
        }}
      >
        <Text style={[styles.website, { color: theme.accent }]}>{APP_WEBSITE_URL}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    paddingTop: 12,
    gap: 4,
  },
  appName: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  version: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  websiteLink: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  website: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
