import { RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui';

const suggestions = [
  'Thanks for sharing those details. Based on your goals, the Growth plan would be a strong fit. I can send a tailored rollout outline today.',
  'Absolutely — I can help with that. Would you like to schedule a quick call so we can review the options together?',
  'That’s a great question. I’ve outlined the relevant next steps and can also share a short implementation guide.',
];

export function AISuggestionPanel({ onUse }: { onUse: (text: string) => void }) {
  const [index, setIndex] = useState(0);
  return <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900 dark:bg-indigo-950/40"><div className="flex items-center gap-2"><Sparkles className="text-indigo-600 dark:text-indigo-300" size={16} /><h3 className="text-sm font-semibold">AI reply suggestion</h3><Button aria-label="Generate another mock suggestion" className="ml-auto" onClick={() => setIndex((value) => (value + 1) % suggestions.length)} size="sm" variant="ghost"><RefreshCw size={14} /></Button></div><p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{suggestions[index]}</p><Button className="mt-3" onClick={() => onUse(suggestions[index]!)} size="sm" variant="outline">Use suggestion</Button></section>;
}
