import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Bot, GitBranch, Play, Zap } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { WorkflowNode } from '../types/workflow.types';

const icons = { trigger: Play, action: Zap, logic: GitBranch, ai: Bot };
const tones = { trigger: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950', action: 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950', logic: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950', ai: 'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950' };

export function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowNode>) {
  const Icon = icons[data.category];
  return <div className={cn('w-56 rounded-xl border-2 p-3 shadow-md', tones[data.category], selected && 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950')}><Handle className="!size-3 !border-2 !border-white !bg-slate-500" position={Position.Top} type="target" /><div className="flex items-start gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/70 dark:bg-slate-900/70"><Icon size={16} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide opacity-60">{data.category}</p><strong className="block truncate text-sm">{data.label}</strong><p className="mt-1 line-clamp-2 text-xs opacity-70">{data.description}</p></div></div><Handle className="!size-3 !border-2 !border-white !bg-indigo-600" position={Position.Bottom} type="source" /></div>;
}
