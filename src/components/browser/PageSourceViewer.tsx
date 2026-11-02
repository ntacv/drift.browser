import React, { useEffect, useState } from 'react';
import { NativeModules, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useI18n } from '../../i18n/useI18n';
import { sourcePage } from '../../hooks/pageSource';
import { useTheme } from '../../theme';

export function PageSourceViewer({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [source, setSource] = useState<{ url: string; html: string } | null>(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let live = true;
    NativeModules.PageTools.pageSource().then((value: { url: string; html: string }) => {
      if (live) setSource(value);
    }).catch(() => { if (live) setError(t('sourceFailed')); });
    return () => { live = false; NativeModules.PageTools.cancelSource(); };
  }, []);
  const page = sourcePage(source?.html ?? '', index);
  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={styles.button}>
    <Text style={{ color: theme.text, opacity: disabled ? 0.4 : 1 }}>{label}</Text>
  </Pressable>;
  const copy = async () => {
    if (!source) return;
    try { await Clipboard.setStringAsync(source.html); }
    catch { setError(t('sourceCopyFailed')); }
  };
  return <View style={[styles.root, { backgroundColor: theme.surface }]}>
    <Text style={{ color: theme.text }}>{t('sourceNotice')}</Text>
    {source && <Text selectable numberOfLines={2} style={{ color: theme.text2 }}>{source.url}</Text>}
    {!source && !error && <Text style={{ color: theme.text }}>{t('sourceLoading')}</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    <ScrollView key={page.page} style={styles.content}><Text selectable style={[styles.code, { color: theme.text }]}>{page.text}</Text></ScrollView>
    {source && <View style={styles.row}>
      {button(t('sourcePrevious'), () => setIndex(page.page - 1), page.page === 0)}
      <Text style={{ color: theme.text }}>{page.page + 1} / {page.pages}</Text>
      {button(t('sourceNext'), () => setIndex(page.page + 1), page.page + 1 >= page.pages)}
    </View>}
    <View style={styles.row}>{button(t('sourceCopy'), copy, !source)}{button(t('close'), onClose)}</View>
  </View>;
}
const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 25, elevation: 25, padding: 12, gap: 8 },
  content: { flex: 1 },
  code: { fontFamily: 'monospace', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { minHeight: 44, padding: 10, justifyContent: 'center' },
});
