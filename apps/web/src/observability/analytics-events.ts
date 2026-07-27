export interface AnalyticsEventMap {
  'navigation.completed': { path: string };
  'ui.action': { action: string; surface: string };
}

export function trackEvent<Name extends keyof AnalyticsEventMap>(
  name: Name,
  payload: AnalyticsEventMap[Name],
) {
  if (import.meta.env.DEV) console.info('[analytics]', name, payload);
}
