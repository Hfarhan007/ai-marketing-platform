import { useEffect, type ReactNode } from 'react';
import { applyDocumentLanguage, useLanguage } from './config';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useLanguage();
  useEffect(() => applyDocumentLanguage(language), [language]);
  return children;
}
