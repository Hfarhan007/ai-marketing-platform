import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, EmptyState, Input, Select } from '@/shared/ui';
import type { Agent } from '../types/agent.types';

export function EscalationRules({ agent, onChange }: { agent: Agent; onChange: (agent: Agent) => void }) {
  const [condition, setCondition] = useState('');
  const [action, setAction] = useState('Assign to human');
  const add = () => { if (!condition.trim()) return; onChange({ ...agent, escalationRules: [...agent.escalationRules, { id: crypto.randomUUID(), condition: condition.trim(), action }] }); setCondition(''); };
  return <section><h2 className="font-semibold">Escalation rules</h2><p className="mt-1 text-sm text-slate-500">Define situations where the mock agent should hand off.</p><div className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-[1fr_13rem_auto]"><Input aria-label="Escalation condition" onChange={(event) => setCondition(event.target.value)} placeholder="e.g. Customer requests a refund" value={condition} /><Select aria-label="Escalation action" onChange={(event) => setAction(event.target.value)} options={['Assign to human', 'Create priority task', 'Notify team lead', 'Stop responding'].map((value) => ({ label: value, value }))} value={action} /><Button disabled={!condition.trim()} onClick={add}><Plus size={15} />Add</Button></div><div className="mt-4 grid gap-3">{agent.escalationRules.length ? agent.escalationRules.map((rule) => <article className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800" key={rule.id}><div className="min-w-0 flex-1"><strong className="text-sm">{rule.condition}</strong><p className="mt-1 text-xs text-slate-500">{rule.action}</p></div><Button aria-label="Delete escalation rule" onClick={() => onChange({ ...agent, escalationRules: agent.escalationRules.filter(({ id }) => id !== rule.id) })} size="sm" variant="ghost"><Trash2 className="text-red-500" size={15} /></Button></article>) : <EmptyState description="Add a rule for sensitive or complex conversations." title="No escalation rules" />}</div></section>;
}
