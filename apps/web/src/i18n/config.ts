import { useSyncExternalStore } from 'react';
import { languages, type LanguageCode } from './languages';

export const LANGUAGE_STORAGE_KEY = 'amp-language';
const isLanguage = (value: string | null): value is LanguageCode =>
  languages.some((item) => item.code === value);
const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
let language: LanguageCode = isLanguage(storedLanguage) ? storedLanguage : 'en';
const listeners = new Set<() => void>();

export function applyDocumentLanguage(next: LanguageCode) {
  const definition = languages.find((item) => item.code === next) ?? languages[0];
  document.documentElement.lang = definition.code;
  document.documentElement.dir = definition.direction;
}

export function setLanguage(next: LanguageCode) {
  if (language === next) return;
  language = next;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  applyDocumentLanguage(next);
  listeners.forEach((listener) => listener());
}

export function getLanguage() {
  return language;
}

export function useLanguage() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getLanguage,
    (): LanguageCode => 'en',
  );
}
