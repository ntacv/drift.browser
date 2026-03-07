import type { SearchEngine } from '../store/types';

const SEARCH_ENGINES: Record<SearchEngine, string> = {
  brave: 'https://search.brave.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
};

export const toDomain = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
};

export const normalizeInputToUrl = (input: string, searchEngine: SearchEngine): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  const looksLikeUrl = trimmed.includes('.') && !trimmed.includes(' ');
  if (looksLikeUrl) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  return `${SEARCH_ENGINES[searchEngine]}${encodeURIComponent(trimmed)}`;
};

export type WebViewBridgeMessage =
  | { type: 'favicon'; favicon: string | null }
  | { type: 'scrollY'; value: number }
  | { type: 'overscrollTop' };

export const parseWebViewBridgeMessage = (payload: string): WebViewBridgeMessage | null => {
  try {
    const parsed = JSON.parse(payload) as {
      type?: string;
      favicon?: string | null;
      value?: number;
    };

    if (parsed.type === 'favicon') {
      return { type: 'favicon', favicon: parsed.favicon ?? null };
    }

    if (parsed.type === 'scrollY') {
      return {
        type: 'scrollY',
        value: typeof parsed.value === 'number' ? parsed.value : 0,
      };
    }

    if (parsed.type === 'overscrollTop') {
      return { type: 'overscrollTop' };
    }

    return null;
  } catch {
    return null;
  }
};

export const faviconInjectionScript = `
  (function() {
    var post = function(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    };

    const candidate = document.querySelector('link[rel~="icon"]');
    const favicon = candidate ? candidate.href : null;
    post({ type: 'favicon', favicon: favicon });

    var lastScrollSentAt = 0;
    var sendScroll = function() {
      var now = Date.now();
      if (now - lastScrollSentAt < 120) {
        return;
      }
      lastScrollSentAt = now;
      var y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      post({ type: 'scrollY', value: y });
    };

    window.addEventListener('scroll', sendScroll, { passive: true });
    sendScroll();

    var touchStartY = 0;
    var armed = false;
    var fired = false;

    window.addEventListener('touchstart', function(event) {
      var y = window.scrollY || window.pageYOffset || 0;
      if (y <= 1 && event.touches && event.touches.length > 0) {
        touchStartY = event.touches[0].clientY;
        armed = true;
        fired = false;
      } else {
        armed = false;
      }
    }, { passive: true });

    window.addEventListener('touchmove', function(event) {
      if (!armed || fired || !event.touches || event.touches.length === 0) {
        return;
      }

      var y = window.scrollY || window.pageYOffset || 0;
      var pullDown = event.touches[0].clientY - touchStartY;
      if (y <= 1 && pullDown > 80) {
        fired = true;
        post({ type: 'overscrollTop' });
      }
    }, { passive: true });
  })();
  true;
`;
