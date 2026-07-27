import { useEffect, useState, type RefObject } from 'react';
export function useIntersectionObserver(ref: RefObject<Element | null>, options?: IntersectionObserverInit, freezeOnceVisible = false) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const frozen = Boolean(entry?.isIntersecting && freezeOnceVisible);
  useEffect(() => {
    const node = ref.current;
    if (!node || frozen || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([next]) => { if (next) setEntry(next); }, options);
    observer.observe(node);
    return () => observer.disconnect();
  }, [freezeOnceVisible, frozen, options, ref]);
  return entry;
}
