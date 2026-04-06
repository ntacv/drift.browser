import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '../i18n/useI18n';
import { useBrowserStore } from '../store/browserStore';
import type { AppLanguage, ThemePreference } from '../store/types';
import { useTheme } from '../theme';
import { TEXT_ON_COLORED_BACKGROUND } from '../../default-settings';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const LANGUAGES: AppLanguage[] = ['en', 'fr'];
const THEMES: ThemePreference[] = ['system', 'dark', 'light'];

const LANGUAGE_LABEL_KEY: Record<AppLanguage, 'languageEnglish' | 'languageFrench'> = {
  en: 'languageEnglish',
  fr: 'languageFrench',
};

const THEME_LABEL_KEY: Record<ThemePreference, 'themeSystem' | 'themeDark' | 'themeLight'> = {
  system: 'themeSystem',
  dark: 'themeDark',
  light: 'themeLight',
};

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const { theme } = useTheme();
  const { language, t } = useI18n();
  const [step, setStep] = React.useState(0);

  const themePreference = useBrowserStore((state) => state.themePreference);
  const setLanguage = useBrowserStore((state) => state.setLanguage);
  const setThemePreference = useBrowserStore((state) => state.setThemePreference);
  const setHasCompletedOnboarding = useBrowserStore((state) => state.setHasCompletedOnboarding);

  const finishOnboarding = React.useCallback(() => {
    setHasCompletedOnboarding(true);
    onComplete();
  }, [onComplete, setHasCompletedOnboarding]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.root}>
        <Text style={[styles.progress, { color: theme.text3 }]}>
          {t('onboardingStep')} {step + 1}/3
        </Text>

        {step === 0 ? (
          <View style={styles.stepCard}>
            <Text style={[styles.title, { color: theme.text }]}>{t('onboardingWelcomeTitle')}</Text>
            <Text style={[styles.subtitle, { color: theme.text2 }]}>{t('onboardingWelcomeBody')}</Text>

            <Text style={[styles.label, { color: theme.text }]}>{t('language')}</Text>
            <View style={styles.chipsRow}>
              {LANGUAGES.map((nextLanguage) => (
                <Pressable
                  key={nextLanguage}
                  onPress={() => setLanguage(nextLanguage)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: language === nextLanguage ? theme.accent : theme.surface2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: language === nextLanguage ? TEXT_ON_COLORED_BACKGROUND : theme.text },
                    ]}
                  >
                    {t(LANGUAGE_LABEL_KEY[nextLanguage])}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.stepCard}>
            <Text style={[styles.title, { color: theme.text }]}>{t('onboardingThemeTitle')}</Text>
            <Text style={[styles.subtitle, { color: theme.text2 }]}>{t('onboardingThemeBody')}</Text>

            <Text style={[styles.label, { color: theme.text }]}>{t('theme')}</Text>
            <View style={styles.chipsRow}>
              {THEMES.map((nextTheme) => (
                <Pressable
                  key={nextTheme}
                  onPress={() => setThemePreference(nextTheme)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: themePreference === nextTheme ? theme.accent : theme.surface2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: themePreference === nextTheme ? TEXT_ON_COLORED_BACKGROUND : theme.text },
                    ]}
                  >
                    {t(THEME_LABEL_KEY[nextTheme])}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stepCard}>
            <Text style={[styles.title, { color: theme.text }]}>{t('onboardingTipsTitle')}</Text>
            <Text style={[styles.subtitle, { color: theme.text2 }]}>{t('onboardingTipsBody')}</Text>

            <View style={[styles.tipBox, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
              <Text style={[styles.tipText, { color: theme.text }]}>{t('onboardingTipSwipeWorkspace')}</Text>
              <Text style={[styles.tipText, { color: theme.text }]}>{t('onboardingTipLongPressLink')}</Text>
              <Text style={[styles.tipText, { color: theme.text }]}>{t('onboardingTipLongPressTab')}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          {step < 2 ? (
            <Pressable
              style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surface2 }]}
              onPress={finishOnboarding}
            >
              <Text style={[styles.secondaryButtonLabel, { color: theme.text }]}>{t('onboardingSkip')}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={() => {
              if (step < 2) {
                setStep((current) => current + 1);
                return;
              }

              finishOnboarding();
            }}
          >
            <Text style={styles.primaryButtonLabel}>{step < 2 ? t('onboardingNext') : t('onboardingDone')}</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  progress: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepCard: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'Inter_800ExtraBold',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minHeight: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  tipBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_500Medium',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonLabel: {
    color: TEXT_ON_COLORED_BACKGROUND,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
