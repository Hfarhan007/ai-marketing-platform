import { Checkbox } from '@/shared/ui';
import type { Agent, AgentChannel } from '../types/agent.types';

const tools = ['Search knowledge', 'Create contact', 'Update contact', 'Create task', 'Assign user', 'Book meeting', 'Add tag'];
const channels: AgentChannel[] = ['website', 'email', 'whatsapp', 'sms', 'instagram', 'messenger'];

export function ToolPermissions({ agent, onChange }: { agent: Agent; onChange: (agent: Agent) => void }) {
  const toggle = <T,>(items: T[], value: T) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
  return <div className="grid gap-6"><fieldset className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><legend className="px-1 font-semibold">Supported channels</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{channels.map((channel) => <Checkbox checked={agent.channels.includes(channel)} key={channel} label={channel[0]!.toUpperCase() + channel.slice(1)} onChange={() => onChange({ ...agent, channels: toggle(agent.channels, channel) })} />)}</div></fieldset><fieldset className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><legend className="px-1 font-semibold">Permitted tools</legend><p className="mb-3 text-xs text-slate-500">Permissions are simulated and do not execute real actions.</p><div className="grid gap-3 sm:grid-cols-2">{tools.map((tool) => <Checkbox checked={agent.tools.includes(tool)} key={tool} label={tool} onChange={() => onChange({ ...agent, tools: toggle(agent.tools, tool) })} />)}</div></fieldset></div>;
}
