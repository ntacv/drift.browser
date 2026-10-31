import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme';

interface Props {
  url: string;
  visible: boolean;
  failed: boolean;
  opening: boolean;
  onChoose: (action: 'stay' | 'external', remember: boolean) => void;
  onDismiss: () => void;
}

export const ExternalLinkSheet = ({ url, visible, failed, opening, onChoose, onDismiss }: Props) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [remember, setRemember] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel={t('close')} disabled={opening} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.row}>
            <Text accessibilityRole="header" style={[styles.title, styles.label, { color: theme.text }]}>{t('externalLinkTitle')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('close')} disabled={opening} style={styles.closeButton} onPress={onDismiss}>
              <Text style={{ color: theme.text2, fontSize: 24 }}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.link}>
            <Text selectable style={{ color: theme.text2 }}>{url}</Text>
          </ScrollView>
          {failed && <Text accessibilityRole="alert" style={{ color: theme.text }}>{t('externalLinkFailed')}</Text>}
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>{t('externalLinkRemember')}</Text>
            <Switch value={remember} onValueChange={setRemember} disabled={opening} accessibilityLabel={t('externalLinkRemember')} />
          </View>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" disabled={opening} style={[styles.button, { backgroundColor: theme.surface2 }]} onPress={() => onChoose('stay', remember)}>
              <Text style={{ color: theme.text, textAlign: 'center' }}>{t('externalLinkStay')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={opening} style={[styles.button, { backgroundColor: theme.surface2, opacity: opening ? 0.5 : 1 }]} onPress={() => onChoose('external', remember)}>
              <Text style={{ color: theme.accent, textAlign: 'center' }}>{t('externalLinkOpen')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12, maxHeight: '85%' },
  title: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  link: { maxHeight: 160 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1 },
  closeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  button: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
});
