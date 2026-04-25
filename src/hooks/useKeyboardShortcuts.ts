'use client';

import { useEffect, useCallback } from 'react';

export type ShortcutAction =
  | 'compose'
  | 'refresh'
  | 'search'
  | 'nextEmail'
  | 'prevEmail'
  | 'reply'
  | 'archive'
  | 'delete'
  | 'star'
  | 'escape'
  | 'classify'
  | 'smartReply';

const DEFAULT_SHORTCUTS: Record<string, ShortcutAction> = {
  c: 'compose',
  r: 'refresh',
  '/': 'search',
  j: 'nextEmail',
  k: 'prevEmail',
  R: 'reply',
  a: 'archive',
  '#': 'delete',
  s: 'star',
  Escape: 'escape',
  x: 'classify',
  z: 'smartReply',
};

export const SHORTCUT_LABELS: Record<ShortcutAction, { key: string; label: string }> = {
  compose: { key: 'C', label: 'Compose new email' },
  refresh: { key: 'R', label: 'Refresh inbox' },
  search: { key: '/', label: 'Focus search' },
  nextEmail: { key: 'J', label: 'Next email' },
  prevEmail: { key: 'K', label: 'Previous email' },
  reply: { key: 'Shift+R', label: 'Reply to email' },
  archive: { key: 'A', label: 'Archive email' },
  delete: { key: '#', label: 'Delete email' },
  star: { key: 'S', label: 'Star/unstar email' },
  escape: { key: 'Esc', label: 'Close/go back' },
  classify: { key: 'X', label: 'Classify with AI' },
  smartReply: { key: 'Z', label: 'Generate smart replies' },
};

export function useKeyboardShortcuts(
  handlers: Partial<Record<ShortcutAction, () => void>>,
  enabled = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't fire shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow Escape even in inputs
        if (e.key !== 'Escape') return;
      }

      // Use Shift+key for uppercase shortcuts
      const key = e.shiftKey && e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const action = DEFAULT_SHORTCUTS[key];

      if (action && handlers[action]) {
        e.preventDefault();
        handlers[action]!();
      }
    },
    [handlers, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
