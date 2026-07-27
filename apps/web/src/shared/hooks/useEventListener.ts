import { useEffect, useEffectEvent } from 'react';

type EventTargetLike = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export function useEventListener<EventType extends Event>(
  name: string,
  handler: (event: EventType) => void,
  target: EventTargetLike | null = typeof window === 'undefined' ? null : window,
  options?: AddEventListenerOptions | boolean,
) {
  const onEvent = useEffectEvent(handler);
  useEffect(() => {
    if (!target) return;
    const listener: EventListener = (event) => onEvent(event as EventType);
    target.addEventListener(name, listener, options);
    return () => target.removeEventListener(name, listener, options);
  }, [name, options, target]);
}
