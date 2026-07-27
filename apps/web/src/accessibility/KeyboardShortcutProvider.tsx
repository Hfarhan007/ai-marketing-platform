import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { KeyboardShortcutContext } from './keyboard-shortcut-context';
import type { KeyboardShortcut } from './KeyboardShortcuts';

function matches(event: KeyboardEvent, shortcut: KeyboardShortcut) {
  return event.key.toLowerCase() === shortcut.key.toLowerCase()
    && Boolean(event.altKey) === Boolean(shortcut.alt)
    && Boolean(event.shiftKey) === Boolean(shortcut.shift)
    && (!shortcut.meta || event.metaKey || event.ctrlKey);
}

export function KeyboardShortcutProvider({ children }: { children: ReactNode }) {
  const shortcuts = useRef(new Map<number, KeyboardShortcut>());
  const nextId = useRef(0);
  const register = useCallback((shortcut: KeyboardShortcut) => {
    const id = ++nextId.current;
    shortcuts.current.set(id, shortcut);
    return () => shortcuts.current.delete(id);
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
      ) return;
      for (const shortcut of shortcuts.current.values()) {
        if (!matches(event, shortcut)) continue;
        event.preventDefault();
        shortcut.handler();
        break;
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const value = useMemo(() => ({ register }), [register]);
  return <KeyboardShortcutContext.Provider value={value}>{children}</KeyboardShortcutContext.Provider>;
}
