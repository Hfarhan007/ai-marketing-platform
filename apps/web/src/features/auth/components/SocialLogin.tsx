import { Code2 } from 'lucide-react';
import { Button } from '@/shared/ui';

export function SocialLogin() {
  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />Or continue with<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>
      <div className="grid grid-cols-2 gap-3">
        <Button disabled title="Social authentication will be connected later." variant="outline"><span className="font-bold">G</span>Google</Button>
        <Button disabled title="Social authentication will be connected later." variant="outline"><Code2 size={17} />GitHub</Button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">Social login is a frontend placeholder.</p>
    </div>
  );
}
