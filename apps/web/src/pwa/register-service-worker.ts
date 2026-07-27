export async function registerServiceWorker(enabled = false) {
  if (!enabled || !('serviceWorker' in navigator)) return undefined;
  try {
    return await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Optional service worker registration failed.', error);
    return undefined;
  }
}
