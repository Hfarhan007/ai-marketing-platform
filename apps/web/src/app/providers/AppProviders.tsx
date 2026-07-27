import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { QueryProvider } from './QueryProvider';
import { RealtimeProvider } from './RealtimeProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';
import { KeyboardShortcutProvider, LiveRegion } from '../../accessibility';
import { LanguageProvider } from '../../i18n';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider><ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <RealtimeProvider>
            <ToastProvider><LiveRegion><KeyboardShortcutProvider>{children}</KeyboardShortcutProvider></LiveRegion></ToastProvider>
          </RealtimeProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider></LanguageProvider>
  );
}
