const KEY = 'amp_widget_consent';
export function storedConsent() { try { return localStorage.getItem(KEY) === 'granted'; } catch { return false; } }
export function saveConsent(granted: boolean) {
  try { localStorage.setItem(KEY, granted ? 'granted' : 'denied'); } catch { /* storage can be blocked in third-party iframes */ }
  window.dispatchEvent(new CustomEvent('amp:widget-consent', { detail: { granted } }));
}
export function resolvePlatformConsent(callback: (granted: boolean) => void) {
  if (!window.__tcfapi) return;
  window.__tcfapi('addEventListener', 2, (data, success) => {
    if (success && ['tcloaded', 'useractioncomplete'].includes(data.eventStatus ?? '')) callback(data.purpose?.consents?.['1'] === true);
  });
}
