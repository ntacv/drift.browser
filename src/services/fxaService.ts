import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { isFirefoxSyncEnabled } from './securityConfig';

const FXA_AUTH_BASE = 'https://accounts.firefox.com/oauth/authorization';
const FXA_TOKEN_ENDPOINT = 'https://oauth.accounts.firefox.com/v1/token';
const REDIRECT_URI = 'drift://fxa-oauth';

const ACCESS_TOKEN_KEY = 'fxa.accessToken';
const REFRESH_TOKEN_KEY = 'fxa.refreshToken';
const USER_ID_KEY = 'fxa.uid';

export const signIn = async (): Promise<{ uid: string; email: string } | null> => {
  if (!isFirefoxSyncEnabled()) {
    return null;
  }

  const authUrl = `${FXA_AUTH_BASE}?client_id=drift-dev&redirect_uri=${encodeURIComponent(
    REDIRECT_URI,
  )}&response_type=code&scope=profile`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
  if (result.type !== 'success' || !result.url.includes('code=')) {
    return null;
  }

  const code = new URL(result.url).searchParams.get('code');
  if (!code) {
    return null;
  }

  // POC note: Without real OAuth credentials, token exchange may fail.
  const response = await fetch(FXA_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      client_id: 'drift-dev',
    }),
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    uid?: string;
    email?: string;
  };

  if (!data.access_token || !data.refresh_token || !data.uid) {
    return null;
  }

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.access_token),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token),
    SecureStore.setItemAsync(USER_ID_KEY, data.uid),
  ]);

  return {
    uid: data.uid,
    email: data.email ?? 'signed-in@firefox.local',
  };
};

export const signOut = async (): Promise<void> => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_ID_KEY),
  ]);
};

export const handleOAuthCallback = async (code: string): Promise<boolean> => {
  // POC stub for deep-link callback handling. Full token exchange happens in signIn.
  return Boolean(code);
};

export const getAccessToken = (): Promise<string | null> => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
