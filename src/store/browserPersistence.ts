import { createJSONStorage, type PersistStorage, type StateStorage } from 'zustand/middleware';
import type { Tab } from './types';

export const TAB_RUNTIME_DEFAULTS = {
  themeColor: null,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  pendingNavAction: null,
  pendingNavActionId: 0,
  scrollY: 0,
  webContentFullscreen: false,
  webError: null,
  hasVideo: false,
  pictureInPictureRequestId: 0,
} satisfies Partial<Tab>;

type SavedTab = Pick<Tab, 'id' | 'workspaceId' | 'url' | 'title' | 'favicon' | 'isPinned' | 'createdAt'>;

const shallowEqual = (left: object, right: object): boolean => {
  const keys = Object.keys(left) as (keyof typeof left)[];
  return keys.length === Object.keys(right).length && keys.every((key) => Object.is(left[key], right[key]));
};

export const createTabProjection = () => {
  let previous: Record<string, SavedTab> = {};
  return (tabs: Record<string, Tab>): Record<string, SavedTab> => {
    const next = Object.fromEntries(Object.entries(tabs).map(([id, tab]) => {
      const saved: SavedTab = {
        id: tab.id,
        workspaceId: tab.workspaceId,
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
        isPinned: tab.isPinned,
        createdAt: tab.createdAt,
      };
      return [id, previous[id] && shallowEqual(previous[id], saved) ? previous[id] : saved];
    }));
    if (!shallowEqual(previous, next)) previous = next;
    return previous;
  };
};

// Compare durable references before JSON serialization; persist also calls setItem for no-op updates.
export const createBrowserStorage = <T extends object>(storage: StateStorage): PersistStorage<T> & {
  prime: (value: { state: T; version?: number }) => void;
} => {
  const json = createJSONStorage<T>(() => storage)!;
  let last: { state: T; version?: number } | undefined;
  let pending = Promise.resolve();
  return {
    prime: (value) => { last = value; },
    getItem: async (name) => {
      await pending;
      last = undefined;
      return json.getItem(name);
    },
    setItem: (name, value) => {
      if (last && last.version === value.version && shallowEqual(last.state, value.state)) return pending;
      last = value;
      pending = pending.then(() => json.setItem(name, value)).then(() => undefined).catch((error) => {
        last = undefined;
        console.warn('Failed to persist browser state:', error);
      });
      return pending;
    },
    removeItem: (name) => {
      last = undefined;
      const removal = pending.then(() => json.removeItem(name)).then(() => undefined);
      pending = removal.catch(() => undefined);
      return removal;
    },
  };
};
