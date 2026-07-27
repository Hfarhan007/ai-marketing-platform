import { useEventListener } from './useEventListener';
export interface KeyboardShortcut { alt?: boolean; ctrl?: boolean; key: string; meta?: boolean; shift?: boolean }
export function useKeyboardShortcut(shortcut: KeyboardShortcut, handler: () => void, enabled = true) {
  useEventListener<KeyboardEvent>('keydown', (event) => {
    const target = event.target;
    if (!enabled || target instanceof HTMLElement && (target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(target.tagName))) return;
    if (event.key.toLocaleLowerCase() === shortcut.key.toLocaleLowerCase()
      && Boolean(event.altKey) === Boolean(shortcut.alt) && Boolean(event.ctrlKey) === Boolean(shortcut.ctrl)
      && Boolean(event.metaKey) === Boolean(shortcut.meta) && Boolean(event.shiftKey) === Boolean(shortcut.shift)) {
      event.preventDefault(); handler();
    }
  });
}
