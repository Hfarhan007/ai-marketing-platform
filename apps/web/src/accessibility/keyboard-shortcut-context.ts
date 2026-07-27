import { createContext, useContext } from 'react';
import type { KeyboardShortcut } from './KeyboardShortcuts';

export interface KeyboardShortcutContextValue {
  register: (shortcut: KeyboardShortcut) => () => void;
}

export const KeyboardShortcutContext = createContext<KeyboardShortcutContextValue | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutContext);
  if (!context) throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutProvider');
  return context;
}
