import React, { useEffect, useRef, useState } from 'react';
import { Image, NativeModules, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme';
import { viewportPoint } from '../../hooks/pagePixels';

export function PageEyedropper({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const dimensions = useWindowDimensions();
  const initialSize = useRef(dimensions);
  const [capture, setCapture] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [color, setColor] = useState('');
  const [error, setError] = useState('');
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const sampling = useRef(0);

  useEffect(() => {
    let live = true;
    // Wait for the menu's closing animation before capturing the composited page.
    const timer = setTimeout(() => NativeModules.PageTools.captureViewport().then((result: typeof capture) => {
      if (live) setCapture(result);
    }).catch(() => { if (live) setError(t('eyedropperFailed')); }), 450);
    return () => { live = false; sampling.current++; clearTimeout(timer); NativeModules.PageTools.discardCapture(); };
  }, []);
  useEffect(() => {
    if (dimensions.width !== initialSize.current.width || dimensions.height !== initialSize.current.height) onClose();
  }, [dimensions.width, dimensions.height]);

  const sample = (x: number, y: number) => {
    const point = viewportPoint(x, y, frame.width, frame.height);
    if (!point) return;
    const id = ++sampling.current;
    NativeModules.PageTools.sample(point.x, point.y)
      .then((value: string) => { if (id === sampling.current) setColor(value); })
      .catch(() => { if (id === sampling.current) setError(t('eyedropperFailed')); });
  };
  const copy = async () => {
    try { await Clipboard.setStringAsync(color); onClose(); }
    catch { setError(t('eyedropperCopyFailed')); }
  };
  if (!capture && !error) return <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} />;
  return <View style={[styles.overlay, { backgroundColor: theme.surface }]}>
    {capture && <View style={styles.imageArea}>
      <View style={{ width: '100%', aspectRatio: capture.width / capture.height, maxHeight: '100%' }}
        onLayout={({ nativeEvent }) => setFrame(nativeEvent.layout)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={({ nativeEvent }) => sample(nativeEvent.locationX, nativeEvent.locationY)}
        onResponderMove={({ nativeEvent }) => sample(nativeEvent.locationX, nativeEvent.locationY)}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={{ uri: capture.uri }} resizeMode="stretch" style={StyleSheet.absoluteFill} /></View>
      </View>
    </View>}
    <Text style={{ color: theme.text }}>{t('eyedropperHint')}</Text>
    {!!color && <View style={styles.row}><View style={{ width: 32, height: 32, backgroundColor: color }} /><Text selectable style={{ color: theme.text }}>{color}</Text></View>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text>}
    <View style={styles.row}>
      <Pressable accessibilityRole="button" disabled={!color} onPress={copy} style={styles.button}><Text style={{ color: theme.text, opacity: color ? 1 : 0.4 }}>{t('eyedropperCopy')}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><Text style={{ color: theme.text }}>{t('close')}</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 25, elevation: 25, padding: 12 },
  imageArea: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 12 },
  button: { minHeight: 44, padding: 12, justifyContent: 'center' },
});
