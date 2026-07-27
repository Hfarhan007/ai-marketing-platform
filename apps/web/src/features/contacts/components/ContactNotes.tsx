import { useState } from 'react';
import { Button, EmptyState, Textarea } from '@/shared/ui';
import type { ContactNote } from '../types/contacts.types';

export function ContactNotes({ loading = false, notes, onAdd }: { loading?: boolean; notes: readonly ContactNote[]; onAdd: (body: string) => void }) {
  const [body, setBody] = useState('');
  return <section><h2 className="text-base font-semibold">Notes</h2><form className="mt-3 grid gap-2" onSubmit={(event) => { event.preventDefault(); if (!body.trim()) return; onAdd(body.trim()); setBody(''); }}><Textarea aria-label="New note" onChange={(event) => setBody(event.target.value)} placeholder="Add context for your team…" rows={3} value={body} /><Button className="justify-self-end" disabled={!body.trim()} loading={loading} size="sm" type="submit">Add note</Button></form><div className="mt-5 space-y-3">{notes.length ? notes.map((note) => <article className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800" key={note.id}><p className="text-sm">{note.body}</p><p className="mt-2 text-xs text-slate-500">{note.author} · {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(note.createdAt))}</p></article>) : <EmptyState description="Add the first note for this contact." title="No notes yet" />}</div></section>;
}
