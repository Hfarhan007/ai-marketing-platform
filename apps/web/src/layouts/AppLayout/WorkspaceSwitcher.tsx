import { Building2, ChevronsUpDown } from 'lucide-react';
import { Dropdown } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { useWorkspace } from '@/app/providers';

export interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const { currentWorkspace, switchWorkspace, workspaces } = useWorkspace();
  return (
    <Dropdown
      items={[
        ...workspaces.map((workspace) => ({ label: workspace.name, onSelect: () => switchWorkspace(workspace.id) })),
        { label: 'Create workspace', onSelect: () => undefined },
      ]}
      label="Switch workspace"
      trigger={
        <span className={cn('flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left dark:border-slate-700 dark:bg-slate-900', collapsed && 'w-11 justify-center px-0')}>
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-indigo-600 text-white"><Building2 size={15} /></span>
          {!collapsed ? <><span className="min-w-0 flex-1 truncate text-sm font-semibold">{currentWorkspace.name}</span><ChevronsUpDown className="text-slate-400" size={15} /></> : null}
        </span>
      }
    />
  );
}
