import { useEffect } from 'react';

export interface KeyboardShortcut {
  alt?: boolean;
  handler: () => void;
  key: string;
  meta?: boolean;
  shift?: boolean;
}

export function KeyboardShortcuts({ shortcuts = [] }: { shortcuts?: readonly KeyboardShortcut[] }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find((item) =>
        item.key.toLowerCase() === event.key.toLowerCase()
        && Boolean(event.altKey) === Boolean(item.alt)
        && Boolean(event.shiftKey) === Boolean(item.shift)
        && (!item.meta || event.metaKey || event.ctrlKey));
      if (shortcut) {
        event.preventDefault();
        shortcut.handler();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [shortcuts]);
  return null;
}
