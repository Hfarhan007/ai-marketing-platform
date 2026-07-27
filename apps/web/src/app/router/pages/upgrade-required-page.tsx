import { CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { routes } from '@/shared/constants/routes';

export default function UpgradeRequiredPage() {
  const navigate = useNavigate();
  return <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 text-center dark:bg-slate-950"><div className="max-w-md"><CreditCard className="mx-auto text-indigo-500" size={48} /><h1 className="mt-6 text-3xl font-bold">Plan upgrade required</h1><p className="mt-3 text-slate-600 dark:text-slate-400">This capability is not included in the workspace subscription.</p><Button className="mt-6" onClick={() => { void navigate(routes.defaultWorkspace); }}>Return to dashboard</Button></div></main>;
}
