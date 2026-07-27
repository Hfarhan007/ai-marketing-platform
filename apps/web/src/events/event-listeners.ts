import { eventBus } from './event-bus';

export function registerApplicationListeners() {
  const unsubscribe = eventBus.subscribe('notification.received', () => undefined);
  return () => unsubscribe();
}
