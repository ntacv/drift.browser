export type ExternalLinkAction = 'ask' | 'stay' | 'external';

export interface ExternalLink {
  url: string;
  fallbackUrl: string | null;
}

const INTERNAL_SCHEMES = new Set(['http', 'https', 'about', 'data', 'file', 'javascript', 'blob']);
export const APP_LINK_DOMAINS: Record<string, readonly string[]> = {
  Reddit: ['reddit.com', 'redd.it'],
  GitHub: ['github.com'],
  YouTube: ['youtube.com', 'youtu.be'],
  Wikipedia: ['wikipedia.org'],
  Instagram: ['instagram.com'],
  Facebook: ['facebook.com', 'fb.com', 'fb.watch'],
  Messenger: ['messenger.com', 'm.me'],
  Threads: ['threads.com', 'threads.net'],
  X: ['x.com', 'twitter.com'],
  TikTok: ['tiktok.com'],
  Snapchat: ['snapchat.com'],
  Pinterest: ['pinterest.com', 'pin.it'],
  LinkedIn: ['linkedin.com'],
  Bluesky: ['bsky.app'],
  Tumblr: ['tumblr.com'],
  WhatsApp: ['whatsapp.com', 'wa.me'],
  Telegram: ['t.me', 'telegram.me'],
  Signal: ['signal.me', 'signal.group'],
  Discord: ['discord.com', 'discord.gg'],
  Spotify: ['open.spotify.com', 'spotify.link'],
  'Apple Music': ['music.apple.com'],
  SoundCloud: ['soundcloud.com'],
  Twitch: ['twitch.tv'],
  Netflix: ['netflix.com'],
  Zoom: ['zoom.us'],
  'Microsoft Teams': ['teams.microsoft.com', 'teams.live.com'],
  Slack: ['slack.com'],
  'Google Maps': ['maps.google.com', 'maps.app.goo.gl'],
  Waze: ['waze.com'],
};

const APP_DOMAINS = Object.values(APP_LINK_DOMAINS).flat();

const isAppWebUrl = (url: URL): boolean => {
  const host = url.hostname.toLowerCase();
  if (APP_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) return true;
  // Shared domains must be restricted to the app's path, not every Google link.
  return ((host === 'google.com' || host === 'www.google.com') && /^\/maps(?:\/|$)/.test(url.pathname))
    || (host === 'goo.gl' && /^\/maps(?:\/|$)/.test(url.pathname));
};

export const getScheme = (url: string): string | null =>
  /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase() ?? null;

export const isWebViewUrl = (url: string): boolean => INTERNAL_SCHEMES.has(getScheme(url) ?? '');

export const safeWebUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !!url.hostname && !url.username && !url.password
      ? url.href : null;
  } catch {
    return null;
  }
};

export const getExternalLink = (url: string): ExternalLink | null => {
  const scheme = getScheme(url);
  if (!scheme) return null;
  if (scheme === 'http' || scheme === 'https') {
    const webUrl = safeWebUrl(url);
    if (!webUrl) return null;
    return isAppWebUrl(new URL(webUrl))
      ? { url, fallbackUrl: webUrl } : null;
  }
  if (INTERNAL_SCHEMES.has(scheme)) return null;

  let fallbackUrl: string | null = null;
  if (scheme === 'intent') {
    const match = /#Intent;(.+);end$/.exec(url);
    const fallback = match?.[1].split(';').find((part) => part.startsWith('S.browser_fallback_url='));
    if (fallback) {
      try {
        fallbackUrl = safeWebUrl(decodeURIComponent(fallback.slice('S.browser_fallback_url='.length)));
      } catch {
        // Malformed or non-web fallbacks must never be executed.
      }
    }
  }
  return { url, fallbackUrl };
};
