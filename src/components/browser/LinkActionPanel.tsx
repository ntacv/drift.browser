import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useI18n } from '../../i18n/useI18n';
import { getActiveTab, useBrowserStore } from '../../store/browserStore';
import { useTheme } from '../../theme';

export const LinkActionPanel = () => {
    const { theme } = useTheme();
    const { t } = useI18n();
    const panel = useBrowserStore((state) => state.linkActionPanel);
    const setLinkActionPanel = useBrowserStore((state) => state.setLinkActionPanel);
    const createTab = useBrowserStore((state) => state.createTab);
    const navigateActiveTab = useBrowserStore((state) => state.navigateActiveTab);
    const activeTab = useBrowserStore(getActiveTab);

    if (!panel) {
        return null;
    }

    const close = () => setLinkActionPanel(null);

    const openInNewTab = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        createTab(undefined, panel.href);
        close();
    };

    const copyLink = async () => {
        await Clipboard.setStringAsync(panel.href);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        close();
    };

    const shareLink = async () => {
        try {
            await Share.share({
                message: panel.href,
                url: panel.href,
            });
        } catch {
            // User dismissed share sheet or share isn't available.
        }
        close();
    };

    const openInCurrentTab = () => {
        if (!activeTab) {
            createTab(undefined, panel.href);
            close();
            return;
        }

        navigateActiveTab(panel.href);
        close();
    };

    return (
        <Modal visible transparent animationType="fade" onRequestClose={close}>
            <Pressable style={styles.backdrop} onPress={close}>
                <Pressable
                    style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => undefined}
                >
                    <View style={[styles.preview, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
                        <MaterialIcons name="link" size={18} color={theme.text2} />
                        <View style={styles.previewTextWrap}>
                            <Text numberOfLines={1} style={[styles.previewTitle, { color: theme.text }]}>
                                {panel.text || panel.href}
                            </Text>
                            <Text numberOfLines={2} style={[styles.previewHref, { color: theme.text2 }]}>
                                {panel.href}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.grid}>
                        <Pressable style={[styles.tile, { backgroundColor: theme.surface2 }]} onPress={openInCurrentTab}>
                            <MaterialIcons name="open-in-browser" size={20} color={theme.accent} />
                            <Text style={[styles.tileLabel, { color: theme.text }]}>{t('openLink')}</Text>
                        </Pressable>
                        <Pressable style={[styles.tile, { backgroundColor: theme.surface2 }]} onPress={openInNewTab}>
                            <MaterialIcons name="open-in-new" size={20} color={theme.accent} />
                            <Text style={[styles.tileLabel, { color: theme.text }]}>{t('openInNewTab')}</Text>
                        </Pressable>
                        <Pressable style={[styles.tile, { backgroundColor: theme.surface2 }]} onPress={copyLink}>
                            <MaterialIcons name="content-copy" size={20} color={theme.accent} />
                            <Text style={[styles.tileLabel, { color: theme.text }]}>{t('copyLink')}</Text>
                        </Pressable>
                        <Pressable style={[styles.tile, { backgroundColor: theme.surface2 }]} onPress={shareLink}>
                            <MaterialIcons name="ios-share" size={20} color={theme.accent} />
                            <Text style={[styles.tileLabel, { color: theme.text }]}>{t('shareLink')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
        padding: 14,
    },
    sheet: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 10,
    },
    preview: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    previewTextWrap: {
        flex: 1,
    },
    previewTitle: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    previewHref: {
        marginTop: 2,
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tile: {
        width: '48%',
        minHeight: 72,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    tileLabel: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
    },
});
