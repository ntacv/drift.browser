import React, { useState } from 'react';
import { NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme';

export function SiteInstallPanel({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const install = async (shortcut: boolean) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try { await NativeModules.PageTools.installSite(shortcut); setMessage(t(shortcut ? 'siteShortcutRequested' : 'siteBrowserOpened')); }
    catch { setMessage(t(shortcut ? 'siteShortcutFailed' : 'siteBrowserFailed')); }
    finally { setBusy(false); }
  };
  return <View style={[styles.panel, { backgroundColor: theme.surface }]}>
    <Text style={{ color: theme.text }}>{t('siteInstallHint')}</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => install(false)} style={styles.button}><Text style={{ color: theme.accent }}>{t('siteInstallBrowser')}</Text></Pressable>
    <Text style={{ color: theme.text2 }}>{t('siteShortcutHint')}</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => install(true)} style={styles.button}><Text style={{ color: theme.text }}>{t('siteAddShortcut')}</Text></Pressable>
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: theme.text }}>{message}</Text>}
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><Text style={{ color: theme.text }}>{t('close')}</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 8, left: 8, right: 8, padding: 16, borderRadius: 12, zIndex: 25, elevation: 25, gap: 8 },
  button: { minHeight: 44, padding: 12, justifyContent: 'center' },
});
