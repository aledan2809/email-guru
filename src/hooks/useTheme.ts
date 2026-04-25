'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [effective, setEffective] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('email_guru_theme') as Theme | null;
    if (stored) {
      setThemeState(stored);
      setEffective(getEffectiveTheme(stored));
    }
  }, []);

  useEffect(() => {
    const eff = getEffectiveTheme(theme);
    setEffective(eff);
    document.documentElement.classList.toggle('light', eff === 'light');
    document.documentElement.classList.toggle('dark', eff === 'dark');
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setEffective(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('email_guru_theme', t);
  }, []);

  return { theme, effective, setTheme };
}
