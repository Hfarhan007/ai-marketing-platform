import { Button } from '@/shared/ui';

export function UpdateNotification({ onUpdate, visible }: { onUpdate: () => void; visible: boolean }) {
  if (!visible) return null;
  return <div className="fixed bottom-4 right-4 z-50 rounded-xl border bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="status"><p className="mb-3 text-sm">A new version is available.</p><Button size="sm" onClick={onUpdate}>Update now</Button></div>;
}
