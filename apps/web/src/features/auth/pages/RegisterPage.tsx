import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../forms/RegisterForm';
import { useAuthStore } from '../store/auth-store';

export function RegisterPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  return <div><h2 className="text-xl font-semibold">Create your account</h2><p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">Start with a frontend-only mock account.</p><RegisterForm onSuccess={(values) => { signIn(false, values.email); void navigate('/onboarding'); }} /><p className="mt-6 text-center text-sm text-slate-500">Already registered? <a className="font-medium text-indigo-600 hover:underline dark:text-indigo-400" href="/login">Sign in</a></p></div>;
}
