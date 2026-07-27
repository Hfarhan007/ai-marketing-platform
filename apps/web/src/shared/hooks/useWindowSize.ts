import { useSyncExternalStore } from 'react';
let cachedWidth = -1;
let cachedHeight = -1;
let cachedSize = { height: 0, width: 0 };
function snapshot() {
  if (window.innerWidth !== cachedWidth || window.innerHeight !== cachedHeight) {
    cachedWidth = window.innerWidth; cachedHeight = window.innerHeight;
    cachedSize = { height: cachedHeight, width: cachedWidth };
  }
  return cachedSize;
}
export function useWindowSize() {
  return useSyncExternalStore(
    (listener) => { window.addEventListener('resize', listener); return () => window.removeEventListener('resize', listener); },
    snapshot,
    () => ({ height: 0, width: 0 }),
  );
}
