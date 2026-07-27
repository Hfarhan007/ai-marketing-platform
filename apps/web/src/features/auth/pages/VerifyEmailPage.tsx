import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui';

export function VerifyEmailPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const resend = () => {
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setSent(true); }, 600);
  };
  return <div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><MailCheck size={27} /></span><h2 className="mt-5 text-xl font-semibold">Verify your email</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This is a mock verification state. No email is sent.</p>{sent ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" role="status">Verification message simulated successfully.</p> : null}<Button className="mt-6 w-full" loading={loading} onClick={resend} variant="outline">Resend verification</Button></div>;
}
