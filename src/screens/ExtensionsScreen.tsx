import React from 'react';
import { Alert, BackHandler, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/translations';
import { useBrowserStore } from '../store/browserStore';
import type { Extension } from '../store/types';
import { useTheme, typography } from '../theme';

const MOZILLA_AMO_URL = 'https://addons.mozilla.org/en-US/android/';

export const ExtensionsScreen = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const extensions = useBrowserStore((state) => state.extensions);
  const uninstallExtension = useBrowserStore((state) => state.uninstallExtension);
  const toggleExtension = useBrowserStore((state) => state.toggleExtension);

  const extensionList: Extension[] = Object.values(extensions).sort(
    (a, b) => b.installedAt - a.installedAt,
  );

  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        navigation.goBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  const handleUninstall = (ext: Extension) => {
    Alert.alert(ext.name, t('extensionUninstallConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('extensionUninstall'),
        style: 'destructive',
        onPress: () => uninstallExtension(ext.id),
      },
    ]);
  };

  const handleBrowse = () => {
    Linking.openURL(MOZILLA_AMO_URL);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('extensionsTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={[styles.browseButton, { backgroundColor: theme.accent }]}
          onPress={handleBrowse}
        >
          <MaterialIcons name="open-in-browser" size={18} color="#fff" style={styles.browseIcon} />
          <Text style={styles.browseButtonText}>{t('extensionsBrowse')}</Text>
        </Pressable>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: theme.surface2 }]}>
              <MaterialIcons name="extension" size={15} color={theme.text2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('extensionsInstalled')}</Text>
          </View>

          {extensionList.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="extension-off" size={36} color={theme.text3} style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: theme.text2 }]}>{t('extensionsEmpty')}</Text>
              <Text style={[styles.emptyHint, { color: theme.text3 }]}>{t('extensionsEmptyHint')}</Text>
            </View>
          ) : (
            extensionList.map((ext, index) => (
              <View key={ext.id}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <ExtensionRow
                  ext={ext}
                  theme={theme}
                  t={t}
                  onToggle={() => toggleExtension(ext.id)}
                  onUninstall={() => handleUninstall(ext)}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface ExtensionRowProps {
  ext: Extension;
  theme: ReturnType<typeof useTheme>['theme'];
  t: (key: TranslationKey) => string;
  onToggle: () => void;
  onUninstall: () => void;
}

const ExtensionRow = ({ ext, theme, t, onToggle, onUninstall }: ExtensionRowProps) => (
  <View style={styles.extensionRow}>
    <View style={[styles.extensionIconWrap, { backgroundColor: theme.surface2 }]}>
      {ext.iconUrl ? (
        <Image source={{ uri: ext.iconUrl }} style={styles.extensionIconImage} />
      ) : (
        <MaterialIcons name="extension" size={22} color={theme.text2} />
      )}
    </View>
    <View style={styles.extensionInfo}>
      <Text style={[styles.extensionName, { color: theme.text }]}>{ext.name}</Text>
      {ext.description.length > 0 && (
        <Text style={[styles.extensionDescription, { color: theme.text2 }]} numberOfLines={2}>
          {ext.description}
        </Text>
      )}
      <View style={styles.extensionMeta}>
        <Text style={[styles.extensionVersion, { color: theme.text3 }]}>
          {t('extensionVersion')} {ext.version}
        </Text>
        {ext.storeUrl ? (
          <Pressable onPress={() => Linking.openURL(ext.storeUrl!)}>
            <MaterialIcons name="open-in-new" size={14} color={theme.accent} style={styles.storeLink} />
          </Pressable>
        ) : null}
      </View>
    </View>
    <View style={styles.extensionControls}>
      <Switch
        value={ext.isEnabled}
        onValueChange={onToggle}
        trackColor={{ false: theme.surface2, true: theme.accent }}
        thumbColor="#fff"
      />
      <Pressable onPress={onUninstall} style={styles.uninstallButton}>
        <MaterialIcons name="delete-outline" size={20} color={theme.danger} />
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
  },
  headerSpacer: {
    width: 30,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  browseIcon: {
    marginRight: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.body,
    fontFamily: typography.fontFamily.bold,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: typography.fontSize.body,
    fontFamily: typography.fontFamily.semiBold,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  extensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  extensionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  extensionIconImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  extensionInfo: {
    flex: 1,
    gap: 2,
  },
  extensionName: {
    fontSize: typography.fontSize.body,
    fontFamily: typography.fontFamily.semiBold,
  },
  extensionDescription: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 16,
  },
  extensionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  extensionVersion: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
  },
  storeLink: {
    marginTop: 1,
  },
  extensionControls: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  uninstallButton: {
    padding: 4,
  },
});
