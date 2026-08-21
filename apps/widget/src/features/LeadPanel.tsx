import { FormEvent, useState } from 'react';
import type { PublicApiClient } from '../lib/api';
export default function LeadPanel({ api, consent }: { api: PublicApiClient; consent: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle'), [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setState('busy'); setError(''); const data = Object.fromEntries(new FormData(event.currentTarget)); try { await api.lead({ ...data, consent }); setState('done'); } catch (v) { setState('idle'); setError(v instanceof Error ? v.message : 'Request failed'); } }
  if (state === 'done') return <p role="status" className="success">Thanks. We’ll be in touch.</p>;
  return <form className="panel form" onSubmit={submit}><label>Name<input autoComplete="name" maxLength={120} name="name" required /></label><label>Email<input autoComplete="email" maxLength={254} name="email" required type="email" /></label><label>How can we help?<textarea maxLength={2000} name="message" rows={3} /></label><button disabled={state === 'busy'} type="submit">Send details</button>{error ? <p role="alert" className="error">{error}</p> : null}</form>;
}
