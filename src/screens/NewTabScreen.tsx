import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBrowserStore } from '../store/browserStore';
import { useTheme } from '../theme';

interface NewTabScreenProps {
  onDone: () => void;
}

export const NewTabScreen = ({ onDone }: NewTabScreenProps) => {
  const { theme } = useTheme();
  const createTab = useBrowserStore((state) => state.createTab);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.root}> 
        <Text style={[styles.title, { color: theme.text }]}>Create a New Tab</Text>
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={() => {
            createTab();
            onDone();
          }}
        >
          <Text style={styles.buttonLabel}>Open New Tab</Text>
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
