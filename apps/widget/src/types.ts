export type WidgetFeature = 'chat' | 'lead' | 'booking';
export type WidgetLocale = 'en' | 'es' | 'ar';
export interface WidgetTheme { primary: string; surface: string; text: string; radius: number; position: 'left' | 'right' }
export interface PublicWidgetConfig {
  workspacePublicId: string;
  name: string;
  locale: WidgetLocale;
  supportedLocales: WidgetLocale[];
  features: WidgetFeature[];
  theme: WidgetTheme;
  consentRequired: boolean;
  privacyUrl?: string;
  bookingLinkSlug?: string;
  greeting?: string;
}
export interface EmbedOptions { workspace: string; apiBase?: string; locale?: WidgetLocale; mode?: 'floating' | 'inline'; container?: string | HTMLElement }
declare global {
  interface Window {
    AiMarketingWidget?: { mount(options: EmbedOptions): { destroy(): void } };
    __tcfapi?: (command: string, version: number, callback: (data: { eventStatus?: string; purpose?: { consents?: Record<string, boolean> } }, success: boolean) => void) => void;
  }
}
