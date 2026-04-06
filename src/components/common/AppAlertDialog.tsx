import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme';

export type AppAlertAction = {
  id: string;
  label: string;
  tone?: 'default' | 'destructive' | 'accent';
  onPress?: () => void;
};

interface AppAlertDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  actions: AppAlertAction[];
  onRequestClose: () => void;
}

export const AppAlertDialog = ({ visible, title, message, actions, onRequestClose }: AppAlertDialogProps) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={() => undefined}
        >
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: theme.text2 }]}>{message}</Text> : null}

          <View style={styles.actionRow}>
            {actions.map((action) => {
              const tone = action.tone ?? 'default';
              const buttonStyle =
                tone === 'accent'
                  ? { backgroundColor: theme.accent, borderColor: theme.accent }
                  : { backgroundColor: theme.surface2, borderColor: theme.border };
              const textColor =
                tone === 'destructive'
                  ? theme.danger
                  : tone === 'accent'
                    ? '#FFFFFF'
                    : theme.text;

              return (
                <Pressable
                  key={action.id}
                  onPress={() => {
                    onRequestClose();
                    action.onPress?.();
                  }}
                  style={({ pressed }) => [styles.actionButton, buttonStyle, pressed && { opacity: 0.75 }]}
                >
                  <Text style={[styles.actionLabel, { color: textColor }]}>{action.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
});