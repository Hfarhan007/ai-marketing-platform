import { FormEvent, useEffect, useState } from 'react';
import type { PublicApiClient } from '../lib/api';
export default function BookingPanel({ api }: { api: PublicApiClient }) {
  const [slots, setSlots] = useState<string[]>([]), [done, setDone] = useState(''), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); void api.slots().then((v) => setSlots(v.slots)).catch((v) => setError(v instanceof Error ? v.message : 'Request failed')); return () => controller.abort(); }, [api]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); try { const result = await api.book(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>); setDone(result.reference); } catch (v) { setError(v instanceof Error ? v.message : 'Request failed'); } }
  if (done) return <p role="status" className="success">Appointment booked. Reference: {done}</p>;
  return <form className="panel form" onSubmit={submit}><label>Time<select name="slot" required><option value="">Select a time</option>{slots.map((slot) => <option key={slot} value={slot}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(slot))}</option>)}</select></label><label>Name<input autoComplete="name" name="name" required /></label><label>Email<input autoComplete="email" name="email" required type="email" /></label><button type="submit">Book appointment</button>{error ? <p role="alert" className="error">{error}</p> : null}</form>;
}
