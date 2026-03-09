import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '../i18n/useI18n';
import { useBrowserStore } from '../store/browserStore';
import { useTheme } from '../theme';
import { TEXT_ON_COLORED_BACKGROUND } from '../../default-settings';

interface NewTabScreenProps {
  onDone: () => void;
}

export const NewTabScreen = ({ onDone }: NewTabScreenProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const createTab = useBrowserStore((state) => state.createTab);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.root}>
        <Text style={[styles.title, { color: theme.text }]}>{t('createNewTabTitle')}</Text>
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={() => {
            createTab();
            onDone();
          }}
        >
          <Text style={styles.buttonLabel}>{t('openNewTab')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  button: {
    minHeight: 46,
    minWidth: 190,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  buttonLabel: {
    color: TEXT_ON_COLORED_BACKGROUND,
    fontSize: 14,
    fontWeight: '700',
  },
});
