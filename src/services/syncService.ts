import Hawk from 'hawk';

import type { BrowserState } from '../store/types';

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

export const pushState = async (state: BrowserState, auth: SyncAuth): Promise<boolean> => {
  const payload = await encryptPayload(JSON.stringify(state));
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

export const pullState = async (auth: SyncAuth): Promise<BrowserState | null> => {
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
    return JSON.parse(plain) as BrowserState;
  } catch {
    return null;
  }
};
