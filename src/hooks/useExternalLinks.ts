import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, NativeModules, Platform } from 'react-native';

import { useBrowserStore } from '../store/browserStore';
import { getExternalLink, safeWebUrl, type ExternalLink } from './externalLinks';

export const useExternalLinks = (tabId: string, visible: boolean, reloadWebView?: () => void) => {
  const [pending, setPending] = useState<ExternalLink | null>(null);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const busy = useRef(false);
  const current = useRef<ExternalLink | null>(null);
  const allowedWebUrl = useRef<string | null>(null);
  const blockedUrl = useRef<string | null>(null);
  const blockedAt = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const stay = useCallback((link: ExternalLink) => {
    blockedUrl.current = link.url;
    if (link.fallbackUrl) {
      allowedWebUrl.current = link.fallbackUrl;
      const store = useBrowserStore.getState();
      const unchangedUrl = store.tabs[tabId]?.url === link.fallbackUrl;
      store.updateTabMeta(tabId, { url: link.fallbackUrl, webError: null, isLoading: false });
      if (unchangedUrl) reloadWebView?.();
    }
    current.current = null;
    setPending(null);
    setFailed(false);
  }, [tabId, reloadWebView]);

  const open = useCallback(async (link: ExternalLink) => {
    if (busy.current) return false;
    busy.current = true;
    setOpening(true);
    setFailed(false);
    try {
      if (Platform.OS === 'android') {
        if (!NativeModules.ExternalLinks?.open) throw new Error('Native external link launcher requires an updated build');
        await NativeModules.ExternalLinks.open(link.url);
      } else {
        await Linking.openURL(link.url);
      }
      if (mounted.current) {
        current.current = null;
        setPending(null);
      }
      return true;
    } catch {
      if (mounted.current) {
        current.current = link;
        setPending(link);
        setFailed(true);
      }
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setOpening(false);
    }
  }, []);

  const request = useCallback((url: string): boolean => {
    const link = getExternalLink(url);
    if (!link) return false;
    if (safeWebUrl(url) === allowedWebUrl.current && allowedWebUrl.current) return false;
    if (!visible || busy.current || current.current || (blockedUrl.current === url && Date.now() - blockedAt.current < 1500)) return true;
    const action = useBrowserStore.getState().externalLinkAction;
    blockedUrl.current = url;
    blockedAt.current = Date.now();
    useBrowserStore.getState().updateTabMeta(tabId, { isLoading: false, webError: null });
    if (action === 'stay') {
      // The original HTTP navigation can proceed without changing WebView source.
      if (safeWebUrl(url)) { allowedWebUrl.current = safeWebUrl(url); return false; }
      stay(link);
    } else if (action === 'external') {
      void open(link);
    } else {
      current.current = link;
      setFailed(false);
      setPending(link);
    }
    return true;
  }, [open, stay, tabId, visible]);

  const choose = async (action: 'stay' | 'external', remember: boolean) => {
    if (!pending || busy.current) return;
    if (action === 'stay') {
      if (remember) useBrowserStore.getState().setExternalLinkAction(action);
      stay(pending);
    } else if (await open(pending)) {
      if (remember) useBrowserStore.getState().setExternalLinkAction(action);
    }
  };

  const dismiss = () => {
    if (busy.current) return;
    current.current = null;
    setPending(null);
    setFailed(false);
  };

  const navigationStarted = (url: string) => {
    if (url !== blockedUrl.current && !current.current && !busy.current) blockedUrl.current = null;
    if (safeWebUrl(url) !== allowedWebUrl.current) allowedWebUrl.current = null;
  };

  return { pending, failed, opening, request, choose, dismiss, navigationStarted };
};
