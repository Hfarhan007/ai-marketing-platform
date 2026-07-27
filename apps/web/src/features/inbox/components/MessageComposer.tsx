import { FilePlus2, Laugh, Send } from 'lucide-react';
import { useState } from 'react';
import { Button, Select, Textarea } from '@/shared/ui';

const templates = [
  { label: 'Choose a template…', value: '' },
  { label: 'Demo follow-up', value: 'Thanks for your time today. Here are the next steps we discussed.' },
  { label: 'Pricing information', value: 'I’m happy to help with pricing. Could you share your expected team size?' },
  { label: 'Meeting confirmation', value: 'Your meeting is confirmed. We look forward to speaking with you!' },
];

export function MessageComposer({ disabled, draft, onDraft, onSend }: { disabled?: boolean; draft: string; onDraft: (value: string) => void; onSend: (body: string) => void }) {
  const [attachment, setAttachment] = useState<string | null>(null);
  const send = () => { if (!draft.trim()) return; onSend(draft.trim()); setAttachment(null); };
  return <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto max-w-3xl"><Select aria-label="Message template" className="mb-2" onChange={(event) => { if (event.target.value) onDraft(event.target.value); }} options={templates} value="" /><Textarea aria-label="Message" className="min-h-20 resize-none" disabled={disabled} onChange={(event) => onDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={disabled ? 'Reopen this conversation to reply.' : 'Write a reply…'} value={draft} />{attachment ? <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800">Attached: {attachment}</div> : null}<div className="mt-2 flex items-center gap-1"><Button aria-label="Attach file" disabled={disabled} onClick={() => setAttachment('campaign-brief.pdf')} size="sm" variant="ghost"><FilePlus2 size={17} /></Button><Button aria-label="Choose emoji (placeholder)" disabled={disabled} onClick={() => onDraft(`${draft} 😊`)} size="sm" variant="ghost"><Laugh size={17} /></Button><span className="ml-2 text-xs text-slate-500">Enter to send · Shift+Enter for a new line</span><Button className="ml-auto" disabled={disabled || !draft.trim()} onClick={send} size="sm"><Send size={15} />Send</Button></div></div></div>;
}
