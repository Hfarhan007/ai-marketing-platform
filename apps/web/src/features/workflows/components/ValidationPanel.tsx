import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { ValidationIssue } from '../types/workflow.types';

export function ValidationPanel({ issues, onSelect }: { issues: readonly ValidationIssue[]; onSelect: (nodeId: string) => void }) {
  return <section className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Validation</h2>{issues.length ? <span className="text-xs text-slate-500">{issues.length} issues</span> : <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={14} />Ready to publish</span>}</div>{issues.length ? <div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto">{issues.map((issue) => <Button className="h-auto justify-start py-1.5 text-left" key={issue.id} onClick={() => issue.nodeId && onSelect(issue.nodeId)} size="sm" variant="ghost">{issue.severity === 'error' ? <XCircle className="shrink-0 text-red-500" size={14} /> : <AlertTriangle className="shrink-0 text-amber-500" size={14} />}<span className="text-xs">{issue.message}</span></Button>)}</div> : null}</section>;
}
