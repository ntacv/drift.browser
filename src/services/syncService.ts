import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

import type { BrowserState, SyncPreferences } from '../store/types';

const SYNC_BASE_URL = 'https://sync-1-us-west4-g.sync.services.mozilla.com';
const SYNC_HOST = 'sync-1-us-west4-g.sync.services.mozilla.com';
const SYNC_PORT = '443';
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

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const NONCE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const textEncoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array): string => {
  let encoded = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    encoded += BASE64_ALPHABET[b0 >> 2];
    encoded += BASE64_ALPHABET[((b0 & 0x03) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    encoded += b1 === undefined ? '=' : BASE64_ALPHABET[((b1 & 0x0f) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    encoded += b2 === undefined ? '=' : BASE64_ALPHABET[b2 & 0x3f];
  }
  return encoded;
};

const randomNonce = (): string => {
  let nonce = '';
  for (let i = 0; i < 6; i += 1) {
    nonce += NONCE_ALPHABET[Math.floor(Math.random() * NONCE_ALPHABET.length)];
  }
  return nonce;
};

/**
 * Build a Hawk Authorization header (https://github.com/hueniverse/hawk).
 *
 * Reimplements Hawk.client.header's MAC generation so sync requests work on
 * React Native, where the Node-only "hawk" package cannot be bundled.
 */
const buildHawkHeader = (auth: SyncAuth, method: 'GET' | 'PUT', resource: string): string => {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = randomNonce();
  // Matches hawk's generateNormalizedString for a header request without a
  // payload hash, ext, app or dlg: seven fields followed by two empty lines.
  const normalized = `hawk.1.header\n${ts}\n${nonce}\n${method}\n${resource}\n${SYNC_HOST}\n${SYNC_PORT}\n\n\n`;
  const mac = toBase64(hmac(sha256, textEncoder.encode(auth.hawkKey), textEncoder.encode(normalized)));
  return `Hawk id="${auth.hawkId}", ts="${ts}", nonce="${nonce}", mac="${mac}"`;
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
