import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAsync, useClipboard, useDebounce, useDisclosure, useDocumentTitle, useEventListener,
  useIntersectionObserver, useInterval, useIsMounted, useKeyboardShortcut, useLocalStorage,
  useMediaQuery, useNetworkStatus, useOutsideClick, usePagination, usePrevious, useQueryParams,
  useSessionStorage, useThrottle, useTimeout, useUnsavedChanges, useWindowSize,
} from './index';

describe('state and timer hooks', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('debounces, throttles, schedules timeout, and schedules intervals', () => {
    const timeout = vi.fn(); const interval = vi.fn();
    const { result, rerender } = renderHook(({ value }) => {
      useTimeout(timeout, 100);
      useInterval(interval, 50);
      return { debounced: useDebounce(value, 100), throttled: useThrottle(value, 100) };
    }, { initialProps: { value: 'a' } });
    rerender({ value: 'b' });
    expect(result.current.debounced).toBe('a');
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toEqual({ debounced: 'b', throttled: 'b' });
    expect(timeout).toHaveBeenCalledOnce();
    expect(interval).toHaveBeenCalledTimes(2);
  });

  it('manages disclosure and pagination state', () => {
    const disclosure = renderHook(() => useDisclosure());
    act(disclosure.result.current.openDisclosure);
    expect(disclosure.result.current.open).toBe(true);
    act(disclosure.result.current.toggle);
    expect(disclosure.result.current.open).toBe(false);
    const pagination = renderHook(() => usePagination(45, 20));
    expect(pagination.result.current.totalPages).toBe(3);
    act(pagination.result.current.next);
    expect(pagination.result.current.page).toBe(2);
  });

  it('tracks previous values and mounted state', () => {
    const hook = renderHook(({ value }) => ({ mounted: useIsMounted(), previous: usePrevious(value) }), { initialProps: { value: 1 } });
    expect(hook.result.current.mounted.current).toBe(true);
    hook.rerender({ value: 2 });
    expect(hook.result.current.previous).toBe(1);
    hook.unmount();
    expect(hook.result.current.mounted.current).toBe(false);
  });
});

describe('browser hooks', () => {
  afterEach(cleanup);
  it('updates the document title and subscribes to events', () => {
    const listener = vi.fn();
    renderHook(() => { useDocumentTitle('Contacts | MarketFlow'); useEventListener<CustomEvent>('workspace', listener, window); });
    expect(document.title).toBe('Contacts | MarketFlow');
    act(() => { window.dispatchEvent(new CustomEvent('workspace')); });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('tracks network and window size through shared subscriptions', () => {
    const onlineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const hook = renderHook(() => ({ network: useNetworkStatus(), size: useWindowSize() }));
    expect(hook.result.current.network).toBe(true);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 });
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(hook.result.current.size.width).toBe(900);
    onlineSpy.mockRestore();
  });

  it('handles media queries, outside clicks, and keyboard shortcuts', () => {
    const mediaListeners = new Set<EventListener>();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({
      addEventListener: (_: string, listener: EventListener) => mediaListeners.add(listener),
      matches: true, media: '(min-width: 800px)',
      onchange: null, removeEventListener: (_: string, listener: EventListener) => mediaListeners.delete(listener),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })) });
    const outside = vi.fn(); const shortcut = vi.fn();
    const element = document.createElement('div'); document.body.append(element);
    const ref = { current: element };
    const hook = renderHook(() => {
      useOutsideClick(ref, outside);
      useKeyboardShortcut({ ctrl: true, key: 'k' }, shortcut);
      return useMediaQuery('(min-width: 800px)');
    });
    expect(hook.result.current).toBe(true);
    act(() => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' })); });
    expect(outside).toHaveBeenCalledOnce();
    expect(shortcut).toHaveBeenCalledOnce();
    element.remove();
  });

  it('warns about unsaved changes', () => {
    renderHook(() => useUnsavedChanges(true));
    const event = new Event('beforeunload', { cancelable: true });
    act(() => { window.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('storage, clipboard, async, observer, and URL hooks', () => {
  afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });

  it('persists local and session state', () => {
    const hook = renderHook(() => ({ local: useLocalStorage('local', 1), session: useSessionStorage('session', 'a') }));
    act(() => { hook.result.current.local[1](2); hook.result.current.session[1]('b'); });
    expect(localStorage.getItem('local')).toBe('2');
    expect(sessionStorage.getItem('session')).toBe('"b"');
    act(hook.result.current.local[2]);
    expect(hook.result.current.local[0]).toBe(1);
  });

  it('copies text and reports clipboard failures', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const hook = renderHook(() => useClipboard(100));
    await act(async () => { expect(await hook.result.current.copy('hello')).toBe(true); });
    expect(hook.result.current.copied).toBe(true);
    act(() => { vi.advanceTimersByTime(100); });
    expect(hook.result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it('runs and cancels typed asynchronous work', async () => {
    const hook = renderHook(() => useAsync<string>());
    await act(async () => { await expect(hook.result.current.run(() => Promise.resolve('done'))).resolves.toBe('done'); });
    expect(hook.result.current.data).toBe('done');
  });

  it('observes intersections and disconnects cleanly', () => {
    const disconnect = vi.fn(); const observe = vi.fn();
    class Observer {
      constructor(callback: IntersectionObserverCallback) { callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
      disconnect = disconnect; observe = observe;
    }
    vi.stubGlobal('IntersectionObserver', Observer);
    const node = document.createElement('div');
    const ref = { current: node };
    const hook = renderHook(() => useIntersectionObserver(ref));
    expect(hook.result.current?.isIntersecting).toBe(true);
    expect(observe).toHaveBeenCalledWith(node);
    hook.unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('reads and updates query parameters', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={['/?page=2']}>{children}</MemoryRouter>;
    const hook = renderHook(() => useQueryParams(), { wrapper });
    expect(hook.result.current.get('page')).toBe('2');
    act(() => hook.result.current.update({ page: 3, tags: ['a', 'b'] }));
    expect(hook.result.current.getAll('tags')).toEqual(['a', 'b']);
  });
});
