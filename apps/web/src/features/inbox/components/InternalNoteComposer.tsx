import { StickyNote } from 'lucide-react';
import { useState } from 'react';
import { Button, Textarea } from '@/shared/ui';

export function InternalNoteComposer({ onAdd }: { onAdd: (body: string) => void }) {
  const [body, setBody] = useState('');
  return <form className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40" onSubmit={(event) => { event.preventDefault(); if (!body.trim()) return; onAdd(body.trim()); setBody(''); }}><div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100"><StickyNote size={15} />Internal note</div><Textarea aria-label="Internal note" className="min-h-16 bg-white dark:bg-slate-900" onChange={(event) => setBody(event.target.value)} placeholder="Visible only to your team…" value={body} /><Button className="justify-self-end" disabled={!body.trim()} size="sm" type="submit" variant="secondary">Add note</Button></form>;
}
