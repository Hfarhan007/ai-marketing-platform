import { Input, Select, Switch, Tabs } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';

export function BuilderInspector({ mobile = false }: { mobile?: boolean }) {
  return (
    <aside aria-label="Element inspector" className={cn('h-full min-h-0 overflow-y-auto border-s border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950', !mobile && 'hidden md:block')}>
      <Tabs items={[
        { label: 'Design', value: 'design', content: <div className="grid gap-4 px-4"><Input defaultValue="Hero section" label="Layer name" /><Select defaultValue="center" label="Alignment" options={[{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }]} /><div className="grid grid-cols-2 gap-3"><Input defaultValue="32" label="Padding" type="number" /><Input defaultValue="16" label="Gap" type="number" /></div><Input defaultValue="#4f46e5" label="Background" type="color" /><Switch checked label="Responsive sizing" /></div> },
        { label: 'Settings', value: 'settings', content: <div className="grid gap-4 px-4"><Input label="Element ID" placeholder="hero-section" /><Switch checked={false} label="Hide on mobile" /></div> },
      ]} />
    </aside>
  );
}
