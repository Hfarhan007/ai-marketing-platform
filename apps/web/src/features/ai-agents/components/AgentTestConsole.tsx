import { Bot, Send, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Button, Input } from '@/shared/ui';
import type { Agent } from '../types/agent.types';

interface ConsoleMessage { id: number; sender: 'user' | 'agent'; body: string }

function mockReply(agent: Agent, prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes('price') || lower.includes('plan')) return `Based on my assigned pricing knowledge, I can help compare available plans. For custom pricing, ${agent.escalationRules.length ? 'I would escalate this to your sales owner.' : 'a teammate should confirm the exact quote.'}`;
  if (lower.includes('hello') || lower.includes('hi')) return agent.welcomeMessage;
  if (lower.includes('human') || lower.includes('person')) return 'Of course. I would create a mock handoff to the appropriate team member.';
  return `Here is a simulated ${agent.tone} response: I understand your question about “${prompt}”. I would search my ${agent.knowledgeSourceIds.length} assigned knowledge sources and provide a verified answer, or use the fallback response if no match is found.`;
}

export function AgentTestConsole({ agent }: { agent: Agent }) {
  const [prompt, setPrompt] = useState(''); const [loading, setLoading] = useState(false); const [nextId, setNextId] = useState(1);
  const [messages, setMessages] = useState<ConsoleMessage[]>([{ id: 0, sender: 'agent', body: agent.welcomeMessage }]);
  const send = () => { if (!prompt.trim()) return; const text = prompt.trim(); setMessages((current) => [...current, { id: nextId, sender: 'user', body: text }]); setNextId((id) => id + 1); setPrompt(''); setLoading(true); window.setTimeout(() => { setMessages((current) => [...current, { id: nextId + 1, sender: 'agent', body: mockReply(agent, text) }]); setNextId((id) => id + 1); setLoading(false); }, 700); };
  return <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"><header className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"><h2 className="font-semibold">Agent test console</h2><p className="text-xs text-slate-500">Deterministic local simulation—no AI request is sent.</p></header><div className="grid min-h-80 content-start gap-3 bg-white p-4 dark:bg-slate-900">{messages.map((message) => <div className={`flex max-w-[85%] gap-2 ${message.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`} key={message.id}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">{message.sender === 'agent' ? <Bot size={14} /> : <UserRound size={14} />}</span><p className={`rounded-xl px-3 py-2 text-sm ${message.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{message.body}</p></div>)}{loading ? <div className="text-sm text-slate-500">Generating mock response…</div> : null}</div><form className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700" onSubmit={(event) => { event.preventDefault(); send(); }}><Input aria-label="Test message" className="flex-1" onChange={(event) => setPrompt(event.target.value)} placeholder="Ask the mock agent…" value={prompt} /><Button disabled={!prompt.trim() || loading} type="submit"><Send size={15} />Send</Button></form></section>;
}
