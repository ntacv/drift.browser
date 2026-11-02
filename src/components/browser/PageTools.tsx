import React, { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, NativeModules, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { create } from 'zustand';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme';
import { PageEyedropper } from './PageEyedropper';
import { PageSourceViewer } from './PageSourceViewer';

export const usePageTools = create<{ action: string | null; request: number }>(() => ({ action: null, request: 0 }));
export const requestPageTool = (action: string) => usePageTools.setState((state) => ({ action, request: state.request + 1 }));
export const closePageTools = () => {
  if (!usePageTools.getState().action) return false;
  usePageTools.setState({ action: null });
  return true;
};
const native = NativeModules.PageTools;

export function PageTools({ hostTag, enabled }: { hostTag: number | null; enabled: boolean }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { action, request } = usePageTools();
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState({ index: 0, total: 0 });
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const sequence = useRef(0);
  const input = useRef<TextInput>(null);
  const printing = useRef(false);

  useEffect(() => {
    if (action !== 'print' || !ready || !native || printing.current) return;
    let live = true;
    printing.current = true;
    native.printPage().then(() => { if (live) closePageTools(); }).catch(() => { if (live) setError(t('pagePrintFailed')); })
      .finally(() => { printing.current = false; });
    return () => { live = false; };
  }, [action, ready]);

  useEffect(() => {
    let live = true;
    setReady(false);
    closePageTools();
    if (enabled && hostTag && native) {
      native.activate(hostTag).then(() => { if (live) setReady(true); }).catch(() => { if (live) setError(t('pageToolsFailed')); });
    }
    return () => { live = false; sequence.current++; native?.deactivate(); closePageTools(); };
  }, [enabled, hostTag]);

  const move = (forward: boolean) => native?.next(forward).catch(() => setError(t('pageToolsFailed')));
  useEffect(() => {
    if (!enabled) return;
    const actions = DeviceEventEmitter.addListener('PageToolsAction', ({ action: next }) => {
      if (next === 'close') closePageTools();
      else if (next === 'next' || next === 'previous') move(next === 'next');
      else requestPageTool(next);
    });
    const matches = DeviceEventEmitter.addListener('PageToolsMatches', (result) => {
      if (result.request === sequence.current) setCounts({ index: result.index, total: result.total });
    });
    return () => { actions.remove(); matches.remove(); };
  }, [enabled]);

  useEffect(() => {
    setError('');
    if (action !== 'find') { setQuery(''); setCounts({ index: 0, total: 0 }); sequence.current++; native?.closeFind(); }
    if (action === 'find') input.current?.focus();
  }, [action, request]);

  useEffect(() => {
    if (action !== 'find' || !ready) return;
    const id = ++sequence.current;
    setCounts({ index: 0, total: 0 });
    const timer = setTimeout(() => native.find(query, id).catch(() => { if (id === sequence.current) setError(t('pageToolsFailed')); }), 150);
    return () => { clearTimeout(timer); sequence.current++; };
  }, [query, action, ready]);

  if (!action || !enabled) return null;
  if (action === 'eyedropper' && native && ready && Platform.OS === 'android') return <PageEyedropper onClose={closePageTools} />;
  if (action === 'source' && native && ready && Platform.OS === 'android') return <PageSourceViewer onClose={closePageTools} />;
  const button = (label: string, handler: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={handler} style={[styles.button, disabled && { opacity: 0.4 }]}>
      <Text style={{ color: theme.text }}>{label}</Text>
    </Pressable>
  );
  return <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    {Platform.OS !== 'android' || !native ? <Text style={{ color: theme.text }}>{t('pageToolsUnsupported')}</Text> : action === 'print' ? <Text accessibilityRole={error ? 'alert' : undefined} style={{ color: theme.text }}>{error || t('pagePrintOpening')}</Text> : <>
      <TextInput ref={input} autoFocus value={query} onChangeText={setQuery} placeholder={t('menuFindPage')} placeholderTextColor={theme.text2}
        accessibilityLabel={t('menuFindPage')} style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        onSubmitEditing={() => move(true)} submitBehavior="submit" />
      <View style={styles.row}>
        <Text accessibilityLiveRegion="polite" style={{ color: theme.text }}>{query && !counts.total ? t('findNoMatches') : `${counts.index} / ${counts.total}`}</Text>
        {button(t('findPrevious'), () => move(false), !counts.total)}
        {button(t('findNext'), () => move(true), !counts.total)}
      </View>
      {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    </>}
    {button(t('close'), closePageTools)}
  </View>;
}
const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, left: 8, right: 8, padding: 12, borderWidth: 1, borderRadius: 12, elevation: 20, zIndex: 20 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { minHeight: 44, padding: 10, justifyContent: 'center' },
});
