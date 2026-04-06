import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useI18n } from '../../i18n/useI18n';
import type { TabWebError } from '../../store/types';
import { useTheme } from '../../theme';

interface ErrorPageProps {
    error: TabWebError;
    onRetry: () => void;
    onDismiss: () => void;
}

const getErrorMessageKey = (code: string): 'webErrorConnectionRefused' | 'webErrorUnknownScheme' | 'webErrorDefault' => {
    const upper = code.toUpperCase();
    if (upper.includes('ERR_CONNECTION_REFUSED')) {
        return 'webErrorConnectionRefused';
    }
    if (upper.includes('ERR_UNKNOWN_URL_SCHEME') || upper.includes('ERR_UNSUPPORTED_SCHEME')) {
        return 'webErrorUnknownScheme';
    }
    return 'webErrorDefault';
};

export const ErrorPage = ({ error, onRetry, onDismiss }: ErrorPageProps) => {
    const { theme } = useTheme();
    const { t } = useI18n();

    return (
        <View style={[styles.overlay, { backgroundColor: theme.bg }]} pointerEvents="box-none">
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <MaterialIcons name="cloud-off" size={30} color={theme.text2} />
                <Text style={[styles.title, { color: theme.text }]}>{t('webErrorTitle')}</Text>
                <Text style={[styles.subtitle, { color: theme.text2 }]}>{t(getErrorMessageKey(error.code))}</Text>
                <Text numberOfLines={1} style={[styles.code, { color: theme.text3 }]}>{error.code}</Text>

                <View style={styles.actionsRow}>
                    <Pressable style={[styles.actionButton, { backgroundColor: theme.surface2 }]} onPress={onDismiss}>
                        <Text style={[styles.actionText, { color: theme.text }]}>{t('dismiss')}</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, { backgroundColor: theme.accent }]} onPress={onRetry}>
                        <Text style={[styles.actionText, { color: '#fff' }]}>{t('retry')}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 5,
    },
    card: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        fontFamily: 'Inter_400Regular',
    },
    code: {
        fontSize: 11,
        fontFamily: 'Inter_600SemiBold',
    },
    actionsRow: {
        marginTop: 6,
        width: '100%',
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        minHeight: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 13,
        fontFamily: 'Inter_700Bold',
    },
});
