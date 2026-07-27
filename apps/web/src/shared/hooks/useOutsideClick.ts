import type { RefObject } from 'react';
import { useEventListener } from './useEventListener';
export function useOutsideClick(ref: RefObject<HTMLElement | null>, handler: () => void, enabled = true) {
  useEventListener<PointerEvent>('pointerdown', (event) => {
    if (enabled && ref.current && !ref.current.contains(event.target as Node)) handler();
  }, typeof document === 'undefined' ? null : document);
}
