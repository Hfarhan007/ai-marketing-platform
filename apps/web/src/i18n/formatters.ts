import type { LanguageCode } from './languages';
import { languages } from './languages';

const localeFor = (language: LanguageCode) =>
  languages.find((item) => item.code === language)?.locale ?? 'en-US';

export const formatNumber = (value: number, language: LanguageCode) =>
  new Intl.NumberFormat(localeFor(language)).format(value);
export const formatCurrency = (value: number, currency: string, language: LanguageCode) =>
  new Intl.NumberFormat(localeFor(language), { currency, style: 'currency' }).format(value);
export const formatDate = (value: Date | string, language: LanguageCode) =>
  new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'medium' }).format(new Date(value));
