import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_NEW_WORKSPACE_COLOR } from '../../../default-settings';
import { ActionMenuPanel, type MenuAction } from './ActionMenuPanel';
import type { MenuTileId } from '../../utils/menuLayout';
import { useI18n } from '../../i18n/useI18n';
import { useBrowserStore, getActiveTab } from '../../store/browserStore';
import { useTheme } from '../../theme';
import { typography } from '../../theme';
import * as fxaService from '../../services/fxaService';
import { AppAlertDialog } from '../common/AppAlertDialog';
import { requestPageTool } from '../browser/PageTools';

interface MenuSheetProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}
const TYPOGRAPHY = typography ?? {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
  },
  fontSize: {
    xs: 10,
    sm: 11,
    base: 12,
    md: 13,
    body: 14,
    lg: 16,
    xl: 20,
    xxl: 22,
    display: 24,
  },
};

export const MenuSheet = ({ onOpenSettings, onOpenHistory }: MenuSheetProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const barPosition = useBrowserStore((state) => state.barPosition);
  const [showFullscreenDialog, setShowFullscreenDialog] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{ title: string; message: string } | null>(null);

  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);
  const syncUser = useBrowserStore((state) => state.syncUser);
  const lastSyncedAt = useBrowserStore((state) => state.lastSyncedAt);
  const setSyncUser = useBrowserStore((state) => state.setSyncUser);
  const menuTileOrder = useBrowserStore((state) => state.menuTileOrder);
  const setMenuTileOrder = useBrowserStore((state) => state.setMenuTileOrder);
  const createWorkspace = useBrowserStore((state) => state.createWorkspace);
  const isUserFullscreen = useBrowserStore((state) => state.isUserFullscreen);
  const setUserFullscreen = useBrowserStore((state) => state.setUserFullscreen);
  const hideFullscreenAlert = useBrowserStore((state) => state.hideFullscreenAlert);
  const setHideFullscreenAlert = useBrowserStore((state) => state.setHideFullscreenAlert);
  const requestActiveTabNavigation = useBrowserStore((state) => state.requestActiveTabNavigation);
  const activeTab = useBrowserStore(getActiveTab);

  const actions: Record<MenuTileId, MenuAction> = {
    back: { label: t('menuBack'), icon: 'arrow-back', disabled: !activeTab?.canGoBack },
    forward: { label: t('menuForward'), icon: 'arrow-forward', disabled: !activeTab?.canGoForward },
    refresh: { label: t('menuRefresh'), icon: 'refresh' },
    fullscreen: { label: t('menuFullscreen'), icon: isUserFullscreen ? 'fullscreen-exit' : 'fullscreen' },
    share: { label: t('menuShareUrl'), icon: 'ios-share' },
    settings: { label: t('menuSettings'), icon: 'settings' },
    history: { label: t('menuHistory'), icon: 'history' },
    workspace: { label: t('menuNewWorkspace'), icon: 'workspaces-outline' },
    find: {
      label: t('menuFindPage'),
      icon: 'search',
      disabled: !activeTab || activeTab.isLoading || !!activeTab.webError || !/^https?:\/\//i.test(activeTab.url),
    },
    eyedropper: {
      label: t('menuEyedropper'),
      icon: 'colorize',
      disabled: !activeTab || activeTab.isLoading || !!activeTab.webError || !/^https?:\/\//i.test(activeTab.url),
    },
  };

  const toggleFullscreen = () => {
    if (!isUserFullscreen) {
      setUserFullscreen(true);
      if (!hideFullscreenAlert) {
        setShowFullscreenDialog(true);
      }
    } else {
      setUserFullscreen(false);
    }
    setMenuOpen(false);
  };

  const executeTileAction = async (id: MenuTileId) => {
    if (id === 'find' || id === 'eyedropper') {
      setMenuOpen(false);
      requestPageTool(id);
      return;
    }
    if (id === 'back' || id === 'forward' || id === 'refresh') {
      requestActiveTabNavigation(id === 'refresh' ? 'reload' : id);
    } else if (id === 'fullscreen') {
      toggleFullscreen();
    } else if (id === 'share') {
      const url = activeTab?.url;
      if (!url) {
        setAlertDialog({ title: t('share'), message: t('noActiveTab') });
        return;
      }

      try {
        await Share.share({
          message: url,
          url,
        });
      } catch {
        setAlertDialog({ title: t('share'), message: url });
      }

      setMenuOpen(false);
    } else if (id === 'settings') {
      setMenuOpen(false);
      onOpenSettings();
    } else if (id === 'history') {
      setMenuOpen(false);
      onOpenHistory();
    } else if (id === 'workspace') {
      createWorkspace(t('menuNewWorkspace'), 'star', DEFAULT_NEW_WORKSPACE_COLOR);
      setMenuOpen(false);
    }
  };

  return (
    <>
      <ActionMenuPanel
        open={isMenuOpen}
        onOpenChange={setMenuOpen}
        order={menuTileOrder}
        onOrderChange={setMenuTileOrder}
        barPosition={barPosition}
        actions={actions}
        onAction={executeTileAction}
      >
          <View style={[styles.accountCard, { backgroundColor: theme.surface2 }]}>
            {syncUser ? (
              <>
                <Text style={[styles.accountTitle, { color: theme.text }]}>{syncUser.email}</Text>
                <Text style={[styles.accountSub, { color: theme.text2 }]}>{t('synced')}</Text>
                <Text style={[styles.accountSub, { color: theme.text3 }]}>
                  {t('lastSync')}: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : t('never')}
                </Text>
              </>
            ) : (
              <Pressable
                onPress={async () => {
                  const user = await fxaService.signIn();
                  if (user) {
                    setSyncUser(user);
                  } else {
                    setAlertDialog({
                      title: t('firefoxSignInNotConfiguredTitle'),
                      message: t('firefoxSignInNotConfiguredMessage'),
                    });
                  }
                }}
              >
                <Text style={[styles.accountTitle, { color: theme.text }]}>{t('signInToFirefox')}</Text>
              </Pressable>
            )}
          </View>
      </ActionMenuPanel>

      <AppAlertDialog
        visible={showFullscreenDialog}
        title={t('fullscreenEnabledTitle')}
        message={t('fullscreenEnabledMessage')}
        onRequestClose={() => setShowFullscreenDialog(false)}
        actions={[
          {
            id: 'hide-next-time',
            label: t('dontShowAgain'),
            onPress: () => setHideFullscreenAlert(true),
          },
          {
            id: 'ok',
            label: t('ok'),
            tone: 'accent',
          },
        ]}
      />

      <AppAlertDialog
        visible={Boolean(alertDialog)}
        title={alertDialog?.title ?? ''}
        message={alertDialog?.message}
        onRequestClose={() => setAlertDialog(null)}
        actions={[
          {
            id: 'ok',
            label: t('ok'),
            tone: 'accent',
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  accountCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  accountTitle: {
    fontSize: TYPOGRAPHY.fontSize.body,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
  },
  accountSub: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    marginTop: 4,
  },
});
