export function shortcutUrl(input: string): string | null {
  try {
    const link = new URL(input);
    if (link.protocol !== 'drift:' || link.hostname !== 'open' || (link.pathname !== '' && link.pathname !== '/') || link.username || link.password) return null;
    const targets = link.searchParams.getAll('url');
    if (targets.length !== 1) return null;
    const raw = targets[0];
    if (/[\u0000-\u0020\u007f]/.test(raw)) return null;
    const target = new URL(raw);
    if (!['http:', 'https:'].includes(target.protocol) || !target.hostname || target.username || target.password) return null;
    return target.href;
  } catch { return null; }
}

export function createShortcutQueue(open: (url: string) => void, now = Date.now) {
  let ready = false;
  const pending = new Set<string>();
  let last = { url: '', time: -Infinity };
  const accept = (input: string) => {
    const url = shortcutUrl(input);
    if (!url) return false;
    if (!ready) { pending.add(url); return true; }
    const time = now();
    if (url !== last.url || time - last.time > 1500) { last = { url, time }; open(url); }
    return true;
  };
  return {
    accept,
    ready: () => { ready = true; for (const url of pending) accept(`drift://open?url=${encodeURIComponent(url)}`); pending.clear(); },
  };
}
