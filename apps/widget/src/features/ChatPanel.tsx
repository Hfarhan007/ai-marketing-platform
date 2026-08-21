import { FormEvent, useState } from 'react';
import type { PublicApiClient } from '../lib/api';
export default function ChatPanel({ api, consent }: { api: PublicApiClient; consent: boolean }) {
  const [messages, setMessages] = useState<Array<{ from: 'visitor' | 'agent'; text: string }>>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget), message = String(form.get('message') ?? '').trim();
    if (!message || busy) return; event.currentTarget.reset(); setMessages((v) => [...v, { from: 'visitor', text: message }]); setBusy(true); setError('');
    try { const result = await api.chat(message, consent); setMessages((v) => [...v, { from: 'agent', text: result.reply }]); } catch (value) { setError(value instanceof Error ? value.message : 'Request failed'); } finally { setBusy(false); }
  }
  return <section aria-label="Website chat" className="panel"><div aria-live="polite" className="messages">{messages.length ? messages.map((m, i) => <p className={`message ${m.from}`} key={`${m.from}-${i}`}>{m.text}</p>) : <p className="muted">How can we help?</p>}</div><form onSubmit={send}><label className="sr-only" htmlFor="widget-message">Message</label><div className="row"><input autoComplete="off" id="widget-message" maxLength={2000} name="message" placeholder="Type a message…" required /><button disabled={busy} type="submit">Send</button></div>{error ? <p role="alert" className="error">{error}</p> : null}</form></section>;
}
