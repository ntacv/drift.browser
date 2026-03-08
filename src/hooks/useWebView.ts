import type { SearchEngine } from '../store/types';

const SEARCH_ENGINES: Record<SearchEngine, string> = {
  brave: 'https://search.brave.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
};

// Pull distance (in pixels) required to trigger refresh
const PULL_TO_REFRESH_THRESHOLD = 200;

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
  | { type: 'overscrollTop' }
  | { type: 'overscrollProgress'; value: number }
  | { type: 'overscrollEnd' }
  | { type: 'fullscreenEnter' }
  | { type: 'fullscreenExit' };

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

    if (parsed.type === 'overscrollProgress') {
      return {
        type: 'overscrollProgress',
        value: typeof parsed.value === 'number' ? parsed.value : 0,
      };
    }

    if (parsed.type === 'overscrollEnd') {
      return { type: 'overscrollEnd' };
    }

    if (parsed.type === 'fullscreenEnter') {
      return { type: 'fullscreenEnter' };
    }

    if (parsed.type === 'fullscreenExit') {
      return { type: 'fullscreenExit' };
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

    var signalFullscreenState = function() {
      var active = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      post({ type: active ? 'fullscreenEnter' : 'fullscreenExit' });
    };

    var wrapRequest = function(name) {
      var original = Element.prototype[name];
      if (typeof original !== 'function') {
        return;
      }

      Element.prototype[name] = function() {
        post({ type: 'fullscreenEnter' });
        try {
          return original.apply(this, arguments);
        } catch (error) {
          return Promise.resolve();
        }
      };
    };

    var wrapExit = function(target, name) {
      var original = target && target[name];
      if (typeof original !== 'function') {
        return;
      }

      target[name] = function() {
        post({ type: 'fullscreenExit' });
        try {
          return original.apply(this, arguments);
        } catch (error) {
          return Promise.resolve();
        }
      };
    };

    wrapRequest('requestFullscreen');
    wrapRequest('webkitRequestFullscreen');
    wrapRequest('webkitRequestFullScreen');
    wrapExit(document, 'exitFullscreen');
    wrapExit(document, 'webkitExitFullscreen');
    wrapExit(document, 'webkitCancelFullScreen');

    document.addEventListener('fullscreenchange', signalFullscreenState);
    document.addEventListener('webkitfullscreenchange', signalFullscreenState);

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
    var currentPullDown = 0;

    window.addEventListener('touchstart', function(event) {
      var y = window.scrollY || window.pageYOffset || 0;
      if (y <= 1 && event.touches && event.touches.length > 0) {
        touchStartY = event.touches[0].clientY;
        armed = true;
        currentPullDown = 0;
        post({ type: 'overscrollProgress', value: 0 });
      } else {
        armed = false;
      }
    }, { passive: true });

    window.addEventListener('touchmove', function(event) {
      if (!armed || !event.touches || event.touches.length === 0) {
        return;
      }

      var y = window.scrollY || window.pageYOffset || 0;
      var pullDown = event.touches[0].clientY - touchStartY;
      
      if (y <= 1) {
        currentPullDown = pullDown;
        var progress = Math.min(1, Math.max(0, pullDown / ${PULL_TO_REFRESH_THRESHOLD}));
        post({ type: 'overscrollProgress', value: progress });
      }
    }, { passive: true });

    window.addEventListener('touchend', function() {
      if (armed) {
        if (currentPullDown > ${PULL_TO_REFRESH_THRESHOLD}) {
          post({ type: 'overscrollTop' });
        }
        post({ type: 'overscrollEnd' });
        armed = false;
        currentPullDown = 0;
      }
    }, { passive: true });

    window.addEventListener('touchcancel', function() {
      if (armed) {
        post({ type: 'overscrollEnd' });
        armed = false;
        currentPullDown = 0;
      }
    }, { passive: true });
  })();
  true;
`;
