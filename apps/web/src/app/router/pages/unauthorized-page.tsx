import { ArrowLeft, ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 text-center dark:bg-slate-950"><div className="max-w-md"><ShieldX className="mx-auto text-amber-500" size={48} /><p className="mt-6 text-sm font-semibold text-amber-600">403</p><h1 className="mt-2 text-3xl font-bold">Access denied</h1><p className="mt-3 text-slate-600 dark:text-slate-400">Your current role does not have permission to open this page.</p><Button className="mt-6" onClick={() => { void navigate(-1); }}><ArrowLeft size={17} />Go back</Button></div></main>;
}
