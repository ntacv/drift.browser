import React from 'react';
import { BackHandler, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { signIn, signOut } from '../services/fxaService';
import { useI18n } from '../i18n/useI18n';
import { useBrowserStore } from '../store/browserStore';
import type { AppLanguage, SearchEngine, TabListSize, ThemePreference } from '../store/types';
import { useTheme } from '../theme';
import { TEXT_ON_COLORED_BACKGROUND } from '../../default-settings';

const SEARCH_ENGINES: SearchEngine[] = ['google', 'brave', 'duckduckgo', 'bing'];
const THEMES: ThemePreference[] = ['system', 'dark', 'light'];
const LANGUAGES: AppLanguage[] = ['en', 'fr'];
const TAB_LIST_SIZES: TabListSize[] = ['compact', 'comfortable', 'expanded'];
const NEW_TAB_PRESETS = ['about:blank', 'https://www.google.com'];

const THEME_LABEL_KEY: Record<ThemePreference, 'themeSystem' | 'themeDark' | 'themeLight'> = {
  system: 'themeSystem',
  dark: 'themeDark',
  light: 'themeLight',
};

const TAB_SIZE_LABEL_KEY: Record<TabListSize, 'tabSizeCompact' | 'tabSizeComfortable' | 'tabSizeExpanded'> = {
  compact: 'tabSizeCompact',
  comfortable: 'tabSizeComfortable',
  expanded: 'tabSizeExpanded',
};

const SEARCH_ENGINE_LABEL_KEY: Record<SearchEngine, 'searchEngineGoogle' | 'searchEngineBrave' | 'searchEngineDuckduckgo' | 'searchEngineBing'> = {
  google: 'searchEngineGoogle',
  brave: 'searchEngineBrave',
  duckduckgo: 'searchEngineDuckduckgo',
  bing: 'searchEngineBing',
};

const LANGUAGE_LABEL_KEY: Record<AppLanguage, 'languageEnglish' | 'languageFrench'> = {
  en: 'languageEnglish',
  fr: 'languageFrench',
};

export const SettingsScreen = () => {
  const { theme } = useTheme();
  const { language, t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const syncUser = useBrowserStore((state) => state.syncUser);
  const lastSyncedAt = useBrowserStore((state) => state.lastSyncedAt);
  const blockTrackers = useBrowserStore((state) => state.blockTrackers);
  const themePreference = useBrowserStore((state) => state.themePreference);
  const searchEngine = useBrowserStore((state) => state.searchEngine);
  const tabListSize = useBrowserStore((state) => state.tabListSize);
  const isLeftHandMode = useBrowserStore((state) => state.isLeftHandMode);
  const defaultNewTabUrl = useBrowserStore((state) => state.defaultNewTabUrl);
  const isTransparentMode = useBrowserStore((state) => state.isTransparentMode);
  const isCompactTabList = useBrowserStore((state) => state.isCompactTabList);
  const isFullUrlVisible = useBrowserStore((state) => state.isFullUrlVisible);

  const setSyncUser = useBrowserStore((state) => state.setSyncUser);
  const setThemePreference = useBrowserStore((state) => state.setThemePreference);
  const setSearchEngine = useBrowserStore((state) => state.setSearchEngine);
  const setLanguage = useBrowserStore((state) => state.setLanguage);
  const setTabListSize = useBrowserStore((state) => state.setTabListSize);
  const setLeftHandMode = useBrowserStore((state) => state.setLeftHandMode);
  const setDefaultNewTabUrl = useBrowserStore((state) => state.setDefaultNewTabUrl);
  const setBlockTrackers = useBrowserStore((state) => state.setBlockTrackers);
  const setTransparentMode = useBrowserStore((state) => state.setTransparentMode);
  const setCompactTabList = useBrowserStore((state) => state.setCompactTabList);
  const setFullUrlVisible = useBrowserStore((state) => state.setFullUrlVisible);

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.goBack();
        return true;
      });

      return () => subscription.remove();
    }, [navigation]),
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={[styles.fixedHeader, { borderBottomColor: theme.border, backgroundColor: theme.bg }]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.backButton, { backgroundColor: theme.surface2, borderColor: theme.border }]}
            >
              <Text style={[styles.backButtonText, { color: theme.text }]}>{t('close')}</Text>
            </Pressable>
            <Text style={[styles.header, { color: theme.text }]}>{t('settingsTitle')}</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 120 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('account')}</Text>
            <Text style={[styles.rowText, { color: theme.text2 }]}>
              {syncUser ? syncUser.email : t('notSignedIn')}
            </Text>
            <Text style={[styles.rowText, { color: theme.text3 }]}>
              {t('lastSynced')}: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : t('never')}
            </Text>

            <Pressable
              style={[styles.button, { backgroundColor: theme.surface2 }]}
              onPress={async () => {
                if (syncUser) {
                  await signOut();
                  setSyncUser(null);
                  return;
                }

                const user = await signIn();
                if (user) {
                  setSyncUser(user);
                }
              }}
            >
              <Text style={[styles.buttonLabel, { color: theme.text }]}>{syncUser ? t('signOut') : t('signInFirefox')}</Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('privacy')}</Text>
            <View style={styles.switchRow}>
              <Text style={[styles.rowText, { color: theme.text }]}>{t('blockTrackers')}</Text>
              <Switch value={blockTrackers} onValueChange={setBlockTrackers} />
            </View>

            <Text style={[styles.sectionSubTitle, { color: theme.text2 }]}>{t('defaultSearchEngine')}</Text>
            <View style={styles.chipsRow}>
              {SEARCH_ENGINES.map((engine) => (
                <Pressable
                  key={engine}
                  onPress={() => setSearchEngine(engine)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: searchEngine === engine ? theme.accent : theme.surface2,
                    },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: searchEngine === engine ? TEXT_ON_COLORED_BACKGROUND : theme.text }]}>{t(SEARCH_ENGINE_LABEL_KEY[engine])}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('newTabs')}</Text>
            <Text style={[styles.rowText, { color: theme.text2 }]}>{t('defaultPageForNewTabs')}</Text>

            <TextInput
              value={defaultNewTabUrl}
              onChangeText={setDefaultNewTabUrl}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface2,
                },
              ]}
              placeholder={t('newTabPlaceholder')}
              placeholderTextColor={theme.text3}
            />

            <Pressable
              onPress={() => setDefaultNewTabUrl('')}
              style={[styles.inlineButton, { backgroundColor: theme.surface2 }]}
            >
              <Text style={[styles.inlineButtonText, { color: theme.text2 }]}>{t('useBlankAndOpenInput')}</Text>
            </Pressable>

            <View style={styles.chipsRow}>
              {NEW_TAB_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setDefaultNewTabUrl(preset)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: defaultNewTabUrl === preset ? theme.accent : theme.surface2,
                    },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: defaultNewTabUrl === preset ? TEXT_ON_COLORED_BACKGROUND : theme.text }]}>{preset}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('tabs')}</Text>
            <View style={styles.switchRow}>
              <Text style={[styles.rowText, { color: theme.text }]}>{t('leftHandMode')}</Text>
              <Switch value={isLeftHandMode} onValueChange={setLeftHandMode} />
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.rowText, { color: theme.text }]}>{t('displayFullUrl')}</Text>
              <Switch value={isFullUrlVisible} onValueChange={setFullUrlVisible} />
            </View>
            <Text style={[styles.rowText, { color: theme.text2 }]}>{t('verticalTabListSize')}</Text>
            <View style={styles.chipsRow}>
              {TAB_LIST_SIZES.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => setTabListSize(size)}
                  style={[styles.chip, { backgroundColor: tabListSize === size ? theme.accent : theme.surface2 }]}
                >
                  <Text style={[styles.chipLabel, { color: tabListSize === size ? TEXT_ON_COLORED_BACKGROUND : theme.text }]}>{t(TAB_SIZE_LABEL_KEY[size])}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('appearance')}</Text>
            <View style={styles.switchRow}>
              <View>
                <Text style={[styles.rowText, { color: theme.text }]}>{t('compactTabList')}</Text>
                <Text style={[styles.helperText, { color: theme.text3 }]}>{t('compactTabListHint')}</Text>
              </View>
              <Switch value={isCompactTabList} onValueChange={setCompactTabList} />
            </View>

            <Text style={[styles.sectionSubTitle, { color: theme.text2 }]}>{t('language')}</Text>
            <View style={styles.chipsRow}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[styles.chip, { backgroundColor: language === lang ? theme.accent : theme.surface2 }]}
                >
                  <Text style={[styles.chipLabel, { color: language === lang ? TEXT_ON_COLORED_BACKGROUND : theme.text }]}>{t(LANGUAGE_LABEL_KEY[lang])}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.rowText, { color: theme.text }]}>{t('transparentMode')}</Text>
              <Switch value={isTransparentMode} onValueChange={setTransparentMode} />
            </View>

            <View style={styles.chipsRow}>
              {THEMES.map((pref) => (
                <Pressable
                  key={pref}
                  onPress={() => setThemePreference(pref)}
                  style={[styles.chip, { backgroundColor: themePreference === pref ? theme.accent : theme.surface2 }]}
                >
                  <Text style={[styles.chipLabel, { color: themePreference === pref ? TEXT_ON_COLORED_BACKGROUND : theme.text }]}>{t(THEME_LABEL_KEY[pref])}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('supportAndAbout')}</Text>

            <Pressable
              style={[styles.button, { backgroundColor: theme.surface2 }]}
              onPress={() => Linking.openURL('mailto:drift.browser@gmail.com')}
            >
              <Text style={[styles.buttonLabel, { color: theme.text }]}>{t('contactSupport')}</Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: theme.surface2 }]}
              onPress={() => Linking.openURL('https://github.com/ntacv/drift.browser')}
            >
              <Text style={[styles.buttonLabel, { color: theme.text }]}>{t('sourceCode')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboardRoot: {
    flex: 1,
  },
  fixedHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  content: {
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 52,
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 0,
  },
  card: {
    borderRadius: 16,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  rowText: {
    fontSize: 13,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 11,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
  },
  inlineButton: {
    minHeight: 34,
    borderRadius: 10,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  inlineButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
