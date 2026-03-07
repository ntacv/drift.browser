import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemePreference } from '../store/types';

export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  accent: string;
  accent2: string;
  text: string;
  text2: string;
  text3: string;
  danger: string;
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export const darkTheme: Theme = {
  bg: '#0d0f14',
  surface: '#141720',
  surface2: '#1c2030',
  border: 'rgba(255,255,255,0.07)',
  accent: '#6c9fff',
  accent2: '#a78bfa',
  text: '#e8eaf2',
  text2: '#7a809a',
  text3: '#454b66',
  danger: '#ff6b6b',
  radius: { sm: 8, md: 14, lg: 20, pill: 100 },
  spacing: { xs: 4, sm: 8, md: 14, lg: 20, xl: 32 },
};

export const lightTheme: Theme = {
  bg: '#f4f6fb',
  surface: '#ffffff',
  surface2: '#eef2fa',
  border: 'rgba(0,0,0,0.08)',
  accent: '#3867d6',
  accent2: '#6a46c8',
  text: '#151a2a',
  text2: '#4d5672',
  text3: '#7e88a8',
  danger: '#d63031',
  radius: { sm: 8, md: 14, lg: 20, pill: 100 },
  spacing: { xs: 4, sm: 8, md: 14, lg: 20, xl: 32 },
};

export const transparentTheme: Theme = {
  bg: 'rgba(13, 15, 20, 0.75)',
  surface: 'rgba(20, 23, 32, 0.85)',
  surface2: 'rgba(28, 32, 48, 0.80)',
  border: 'rgba(255,255,255,0.10)',
  accent: '#6c9fff',
  accent2: '#a78bfa',
  text: '#e8eaf2',
  text2: '#7a809a',
  text3: '#454b66',
  danger: '#ff6b6b',
  radius: { sm: 8, md: 14, lg: 20, pill: 100 },
  spacing: { xs: 4, sm: 8, md: 14, lg: 20, xl: 32 },
};

export const lightTransparentTheme: Theme = {
  bg: 'rgba(244, 246, 251, 0.75)',
  surface: 'rgba(255, 255, 255, 0.85)',
  surface2: 'rgba(238, 242, 250, 0.80)',
  border: 'rgba(0,0,0,0.12)',
  accent: '#3867d6',
  accent2: '#6a46c8',
  text: '#151a2a',
  text2: '#4d5672',
  text3: '#7e88a8',
  danger: '#d63031',
  radius: { sm: 8, md: 14, lg: 20, pill: 100 },
  spacing: { xs: 4, sm: 8, md: 14, lg: 20, xl: 32 },
};

interface ThemeContextValue {
  theme: Theme;
  mode: 'light' | 'dark';
  preference: ThemePreference;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  mode: 'dark',
  preference: 'system',
});

interface ThemeProviderProps {
  preference: ThemePreference;
  isTransparentMode: boolean;
  children: React.ReactNode;
}

export const ThemeProvider = ({ preference, isTransparentMode, children }: ThemeProviderProps) => {
  const system = useColorScheme();

  const mode = useMemo<'light' | 'dark'>(() => {
    if (preference === 'system') {
      return system === 'light' ? 'light' : 'dark';
    }
    return preference;
  }, [preference, system]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: isTransparentMode 
        ? (mode === 'dark' ? transparentTheme : lightTransparentTheme)
        : (mode === 'dark' ? darkTheme : lightTheme),
      mode,
      preference,
    }),
    [mode, preference, isTransparentMode],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
