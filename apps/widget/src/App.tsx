import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ConsentBanner } from './ConsentBanner';
import { t } from './i18n';
import { PublicApiClient } from './lib/api';
import { storedConsent } from './lib/consent';
import { anonymousVisitorId } from './lib/visitor';
import type { PublicWidgetConfig, WidgetFeature, WidgetLocale } from './types';
const ChatPanel = lazy(() => import('./features/ChatPanel')), LeadPanel = lazy(() => import('./features/LeadPanel')), BookingPanel = lazy(() => import('./features/BookingPanel'));
export function App() {
  const params = new URLSearchParams(location.search), workspace = params.get('workspace') ?? '', apiBase = params.get('api') ?? location.origin, requestedLocale = (params.get('locale') ?? 'en') as WidgetLocale;
  const api = useMemo(() => new PublicApiClient(apiBase.replace(/\/$/u, ''), workspace, anonymousVisitorId()), [apiBase, workspace]);
  const [config, setConfig] = useState<PublicWidgetConfig>(), [open, setOpen] = useState(params.get('mode') === 'inline'), [tab, setTab] = useState<WidgetFeature>('chat'), [consent, setConsent] = useState(storedConsent()), [decided, setDecided] = useState(storedConsent()), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); void api.config(controller.signal).then((value) => { setConfig(value); setTab(value.features[0] ?? 'chat'); }).catch(() => setError('unavailable')); return () => controller.abort(); }, [api]);
  const locale = config?.supportedLocales.includes(requestedLocale) ? requestedLocale : config?.locale ?? 'en', copy = t(locale), direction = locale === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = direction; }, [locale, direction]);
  const theme = config?.theme;
  return <main className={`widget position-${theme?.position ?? 'right'}`} dir={direction} style={{ '--primary': theme?.primary, '--surface': theme?.surface, '--text': theme?.text, '--radius': `${theme?.radius ?? 16}px` } as React.CSSProperties}>
    {open ? <section aria-label={config?.name ?? 'Customer support'} className="window"><header><strong>{config?.name ?? copy.loading}</strong><button aria-label={copy.close} className="icon" onClick={() => setOpen(false)} type="button">×</button></header>{error ? <p role="alert" className="panel error">{copy.unavailable}</p> : config ? <>{config.consentRequired && !decided ? <ConsentBanner copy={copy} onDecision={(value) => { setConsent(value); setDecided(true); }} /> : <><nav aria-label="Widget sections">{config.features.map((feature) => <button aria-current={tab === feature ? 'page' : undefined} className={tab === feature ? 'active' : ''} key={feature} onClick={() => setTab(feature)} type="button">{copy[feature]}</button>)}</nav><Suspense fallback={<p className="panel" role="status">{copy.loading}</p>}>{tab === 'chat' ? <ChatPanel api={api} consent={consent} /> : tab === 'lead' ? <LeadPanel api={api} consent={consent} /> : <BookingPanel api={api} />}</Suspense></>}</> : <p className="panel" role="status">{copy.loading}</p>}</section> : <button aria-label={copy.open} className="launcher" onClick={() => setOpen(true)} type="button">?</button>}
  </main>;
}
