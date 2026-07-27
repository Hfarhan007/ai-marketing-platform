/**
 * Convenience storage for non-sensitive preferences only. Browser storage is
 * not secure and must never contain secrets, session tokens, or API keys.
 */
export const preferenceStorage = {
  get: (key: string) => localStorage.getItem(key),
  remove: (key: string) => localStorage.removeItem(key),
  set: (key: string, value: string) => localStorage.setItem(key, value),
};
