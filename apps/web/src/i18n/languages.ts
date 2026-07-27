export const languages = [
  { code: 'en', direction: 'ltr', label: 'English', locale: 'en-US' },
  { code: 'ur', direction: 'rtl', label: 'اردو', locale: 'ur-PK' },
  { code: 'ar', direction: 'rtl', label: 'العربية', locale: 'ar-SA' },
] as const;

export type LanguageCode = (typeof languages)[number]['code'];
