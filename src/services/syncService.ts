import Hawk from 'hawk';

import type { BrowserState, SyncPreferences } from '../store/types';

const SYNC_BASE_URL = 'https://sync-1-us-west4-g.sync.services.mozilla.com';
const COLLECTION_PATH = '/storage/drift-state/state';

const encryptPayload = async (plain: string): Promise<string> => {
  // TODO: Replace identity transform with AES-256-GCM client-side encryption.
  return plain;
};

const decryptPayload = async (cipher: string): Promise<string> => {
  // TODO: Replace identity transform with AES-256-GCM client-side decryption.
  return cipher;
};

interface SyncAuth {
  keyId: string;
  hawkId: string;
  hawkKey: string;
}

const buildHawkHeader = (auth: SyncAuth, method: 'GET' | 'PUT', resource: string): string => {
  const { field } = Hawk.client.header(`${SYNC_BASE_URL}${resource}`, method, {
    credentials: {
      id: auth.hawkId,
      key: auth.hawkKey,
      algorithm: 'sha256',
    },
  });
  return field;
};

/** Return a filtered snapshot of state containing only the categories enabled in prefs. */
const filterStateByPrefs = (state: BrowserState, prefs: SyncPreferences): Partial<BrowserState> => {
  const filtered: Partial<BrowserState> = {};
  if (prefs.syncWorkspaces || prefs.syncTabs) {
    // Workspace metadata is always included when syncing either tabs or workspaces,
    // because tabs are associated with workspaces.
    filtered.workspaces = state.workspaces;
    filtered.workspaceOrder = state.workspaceOrder;
    filtered.activeWorkspaceId = state.activeWorkspaceId;
  }
  if (prefs.syncTabs) {
    filtered.tabs = state.tabs;
  }
  if (prefs.syncBookmarks) {
    filtered.bookmarks = state.bookmarks;
    filtered.bookmarkFolders = state.bookmarkFolders;
  }
  if (prefs.syncHistory) {
    filtered.history = state.history;
  }
  return filtered;
};

export const pushState = async (state: BrowserState, auth: SyncAuth, prefs?: SyncPreferences): Promise<boolean> => {
  const dataToSync = prefs ? filterStateByPrefs(state, prefs) : state;
  const payload = await encryptPayload(JSON.stringify(dataToSync));
  const resource = COLLECTION_PATH;

  const response = await fetch(`${SYNC_BASE_URL}${resource}`, {
    method: 'PUT',
    headers: {
      Authorization: buildHawkHeader(auth, 'PUT', resource),
      'Content-Type': 'application/json',
      'x-keyID': auth.keyId,
      'x-weave-records': 'true',
    },
    body: JSON.stringify({
      id: 'state',
      payload,
    }),
  }).catch(() => null);

  return Boolean(response?.ok);
};

export const pullState = async (auth: SyncAuth, prefs?: SyncPreferences): Promise<Partial<BrowserState> | null> => {
  const resource = COLLECTION_PATH;
  const response = await fetch(`${SYNC_BASE_URL}${resource}`, {
    method: 'GET',
    headers: {
      Authorization: buildHawkHeader(auth, 'GET', resource),
      'x-keyID': auth.keyId,
      'x-weave-records': 'true',
    },
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  const body = (await response.json()) as { payload?: string };
  if (!body.payload) {
    return null;
  }

  try {
    const plain = await decryptPayload(body.payload);
    const full = JSON.parse(plain) as Partial<BrowserState>;
    if (!prefs) {
      return full;
    }
    // Only return categories the user wants to sync
    const merged: Partial<BrowserState> = {};
    if ((prefs.syncWorkspaces || prefs.syncTabs) && full.workspaces !== undefined) {
      // Workspace metadata is always included when syncing either tabs or workspaces,
      // because tabs are associated with workspaces.
      merged.workspaces = full.workspaces;
      merged.workspaceOrder = full.workspaceOrder;
      merged.activeWorkspaceId = full.activeWorkspaceId;
    }
    if (prefs.syncTabs && full.tabs !== undefined) {
      merged.tabs = full.tabs;
    }
    if (prefs.syncBookmarks && full.bookmarks !== undefined) {
      merged.bookmarks = full.bookmarks;
      merged.bookmarkFolders = full.bookmarkFolders;
    }
    if (prefs.syncHistory && full.history !== undefined) {
      merged.history = full.history;
    }
    return merged;
  } catch {
    return null;
  }
};
