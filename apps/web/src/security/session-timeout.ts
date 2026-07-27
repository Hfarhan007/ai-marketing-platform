export function createSessionTimeout(onTimeout: () => void, timeoutMs: number) {
  let timer = window.setTimeout(onTimeout, timeoutMs);
  return {
    dispose: () => window.clearTimeout(timer),
    reset: () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onTimeout, timeoutMs);
    },
  };
}
