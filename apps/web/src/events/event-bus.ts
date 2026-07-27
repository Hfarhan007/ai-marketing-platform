import type { ApplicationEventMap } from './event-types';

type Handler<Payload> = (payload: Payload) => void;
type AnyHandler = (payload: unknown) => void;
const listeners = new Map<keyof ApplicationEventMap, Set<AnyHandler>>();

export const eventBus = {
  publish<Name extends keyof ApplicationEventMap>(name: Name, payload: ApplicationEventMap[Name]) {
    listeners.get(name)?.forEach((handler) => handler(payload));
  },
  subscribe<Name extends keyof ApplicationEventMap>(name: Name, handler: Handler<ApplicationEventMap[Name]>) {
    const group = listeners.get(name) ?? new Set<AnyHandler>();
    const wrapped: AnyHandler = (payload) => handler(payload as ApplicationEventMap[Name]);
    group.add(wrapped);
    listeners.set(name, group);
    return () => {
      group.delete(wrapped);
      if (group.size === 0) listeners.delete(name);
    };
  },
  clear() {
    listeners.clear();
  },
};
