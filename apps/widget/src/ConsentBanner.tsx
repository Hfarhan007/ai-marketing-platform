import { useEffect } from 'react';
import { resolvePlatformConsent, saveConsent } from './lib/consent';
export function ConsentBanner({ copy, onDecision }: { copy: { consent: string; allow: string; decline: string }; onDecision(value: boolean): void }) {
  const decide = (value: boolean) => { saveConsent(value); onDecision(value); };
  useEffect(() => resolvePlatformConsent(decide), []);
  return <div aria-label="Privacy consent" className="consent" role="dialog"><p>{copy.consent}</p><div className="row"><button onClick={() => decide(true)} type="button">{copy.allow}</button><button className="secondary" onClick={() => decide(false)} type="button">{copy.decline}</button></div></div>;
}
