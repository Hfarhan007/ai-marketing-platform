import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { TwoFactorForm } from '../forms/TwoFactorForm';

export function TwoFactorPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  return <div><h2 className="text-xl font-semibold">Two-factor authentication</h2><p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">Enter the mock six-digit code to continue.</p><TwoFactorForm onSuccess={() => { signIn(false); void navigate('/app/demo-workspace/dashboard'); }} /></div>;
}
