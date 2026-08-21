import type { WidgetLocale } from './types';
const messages = {
  en: { open: 'Open customer support', close: 'Close', chat: 'Chat', lead: 'Contact', booking: 'Book', consent: 'Allow this widget to store an anonymous visitor ID and process your messages.', allow: 'Allow', decline: 'Decline', loading: 'Loading…', unavailable: 'Widget unavailable.' },
  es: { open: 'Abrir atención al cliente', close: 'Cerrar', chat: 'Chat', lead: 'Contacto', booking: 'Reservar', consent: 'Permite que este widget almacene un identificador anónimo y procese tus mensajes.', allow: 'Permitir', decline: 'Rechazar', loading: 'Cargando…', unavailable: 'Widget no disponible.' },
  ar: { open: 'فتح دعم العملاء', close: 'إغلاق', chat: 'محادثة', lead: 'تواصل', booking: 'حجز', consent: 'اسمح لهذه الأداة بحفظ معرّف زائر مجهول ومعالجة رسائلك.', allow: 'سماح', decline: 'رفض', loading: 'جارٍ التحميل…', unavailable: 'الأداة غير متاحة.' },
} as const;
export const t = (locale: WidgetLocale) => messages[locale] ?? messages.en;
