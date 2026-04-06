import React from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { normalizeInputToUrl } from '../hooks/useWebView';
import { useI18n } from '../i18n/useI18n';
import { getActiveTab, useBrowserStore } from '../store/browserStore';
import { useTheme } from '../theme';
import { AppAlertDialog } from '../components/common/AppAlertDialog';

export const HistoryScreen = () => {
    const { theme } = useTheme();
    const { t } = useI18n();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [isSearchOpen, setSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showClearHistoryDialog, setShowClearHistoryDialog] = React.useState(false);
    const searchInputRef = React.useRef<TextInput | null>(null);

    const history = useBrowserStore((state) => state.history);
    const searchEngine = useBrowserStore((state) => state.searchEngine);
    const activeTab = useBrowserStore(getActiveTab);
    const navigateActiveTab = useBrowserStore((state) => state.navigateActiveTab);
    const createTab = useBrowserStore((state) => state.createTab);
    const clearHistory = useBrowserStore((state) => state.clearHistory);

    const trimmedQuery = searchQuery.trim();
    const filteredHistory = React.useMemo(() => {
        if (!trimmedQuery) {
            return history;
        }

        const q = trimmedQuery.toLowerCase();
        return history.filter(
            (item) => item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q),
        );
    }, [history, trimmedQuery]);

    useFocusEffect(
        React.useCallback(() => {
            const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
                navigation.goBack();
                return true;
            });

            return () => subscription.remove();
        }, [navigation]),
    );

    const openHistoryEntry = (url: string) => {
        if (!activeTab) {
            createTab(undefined, url);
            navigation.goBack();
            return;
        }

        navigateActiveTab(url);
        navigation.goBack();
    };

    const confirmClearHistory = () => {
        setShowClearHistoryDialog(true);
    };

    const searchWebFromQuery = () => {
        const nextUrl = normalizeInputToUrl(trimmedQuery, searchEngine);
        if (!nextUrl) {
            return;
        }

        createTab(undefined, nextUrl);
        navigation.goBack();
    };

    React.useEffect(() => {
        if (!isSearchOpen) {
            return;
        }

        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 40);

        return () => clearTimeout(timer);
    }, [isSearchOpen]);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
            <View style={[styles.fixedHeader, { borderBottomColor: theme.border, backgroundColor: theme.bg }]}>
                <View style={styles.headerRow}>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        style={[styles.backButton, { backgroundColor: theme.surface2, borderColor: theme.border }]}
                    >
                        <Text style={[styles.backButtonText, { color: theme.text }]}>{t('close')}</Text>
                    </Pressable>
                    <Text style={[styles.header, { color: theme.text }]}>{t('historyTitle')}</Text>
                    <Pressable
                        onPress={() => {
                            if (isSearchOpen && !searchQuery) {
                                setSearchOpen(false);
                                return;
                            }
                            setSearchOpen((prev) => !prev);
                        }}
                        style={[styles.searchButton, { backgroundColor: theme.surface2, borderColor: theme.border }]}
                    >
                        <MaterialIcons name={isSearchOpen ? 'close' : 'search'} size={16} color={theme.text} />
                    </Pressable>
                </View>

                {isSearchOpen ? (
                    <TextInput
                        ref={(node) => {
                            searchInputRef.current = node;
                        }}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder={t('searchHistoryPlaceholder')}
                        placeholderTextColor={theme.text3}
                        style={[
                            styles.searchInput,
                            { color: theme.text, backgroundColor: theme.surface2, borderColor: theme.border },
                        ]}
                    />
                ) : null}
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 40 }]}>
                {trimmedQuery ? (
                    <Pressable
                        onPress={searchWebFromQuery}
                        style={[styles.searchRow, { backgroundColor: theme.surface2, borderColor: theme.border }]}
                    >
                        <MaterialIcons name="travel-explore" size={16} color={theme.accent} />
                        <Text numberOfLines={1} style={[styles.searchRowText, { color: theme.text }]}>
                            {`${t('searchTheWebFor')} \"${trimmedQuery}\"...`}
                        </Text>
                    </Pressable>
                ) : null}

                <Pressable
                    onPress={confirmClearHistory}
                    style={[styles.clearButton, { backgroundColor: theme.surface2, borderColor: theme.border }]}
                >
                    <MaterialIcons name="delete-outline" size={16} color={theme.danger} />
                    <Text style={[styles.clearButtonText, { color: theme.danger }]}>{t('clearHistory')}</Text>
                </Pressable>

                {filteredHistory.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
                        <MaterialIcons name="history" size={24} color={theme.text3} />
                        <Text style={[styles.emptyText, { color: theme.text2 }]}>{t('historyEmpty')}</Text>
                    </View>
                ) : (
                    filteredHistory.map((item) => (
                        <Pressable
                            key={item.id}
                            onPress={() => openHistoryEntry(item.url)}
                            style={[styles.historyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        >
                            <View style={styles.historyMainColumn}>
                                <Text numberOfLines={1} style={[styles.historyTitle, { color: theme.text }]}>
                                    {item.title}
                                </Text>
                                <Text numberOfLines={1} style={[styles.historyUrl, { color: theme.text2 }]}>
                                    {item.url}
                                </Text>
                            </View>
                            <View style={styles.historyMetaColumn}>
                                <Text numberOfLines={1} style={[styles.historyMetaText, { color: theme.text3 }]}>
                                    {new Date(item.visitedAt).toLocaleDateString()}
                                </Text>
                                <Text numberOfLines={1} style={[styles.historyMetaText, { color: theme.text3 }]}>
                                    {new Date(item.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            <AppAlertDialog
                visible={showClearHistoryDialog}
                title={t('clearHistory')}
                message={t('clearHistoryConfirm')}
                onRequestClose={() => setShowClearHistoryDialog(false)}
                actions={[
                    { id: 'cancel', label: t('cancel') },
                    {
                        id: 'confirm',
                        label: t('clearHistory'),
                        tone: 'destructive',
                        onPress: () => clearHistory(),
                    },
                ]}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    fixedHeader: {
        borderBottomWidth: 1,
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 10,
    },
    content: {
        padding: 14,
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    backButton: {
        minHeight: 34,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
    },
    headerSpacer: {
        width: 52,
    },
    searchButton: {
        width: 34,
        height: 34,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInput: {
        marginTop: 8,
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 40,
        paddingHorizontal: 12,
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
    },
    header: {
        fontSize: 22,
        fontFamily: 'Inter_800ExtraBold',
        marginBottom: 0,
    },
    clearButton: {
        minHeight: 40,
        borderWidth: 1,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 4,
    },
    clearButtonText: {
        fontSize: 13,
        fontFamily: 'Inter_700Bold',
    },
    searchRow: {
        minHeight: 40,
        borderWidth: 1,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
    },
    searchRowText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    emptyCard: {
        borderRadius: 14,
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    historyRow: {
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 7,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    historyMainColumn: {
        flex: 1,
        gap: 1,
        minWidth: 0,
    },
    historyMetaColumn: {
        width: 96,
        alignItems: 'flex-end',
        gap: 1,
    },
    historyTitle: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    historyUrl: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
    },
    historyMetaText: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
    },
});
