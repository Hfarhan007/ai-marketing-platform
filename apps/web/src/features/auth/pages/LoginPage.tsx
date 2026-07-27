import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { isSafeReturnUrl, routes } from '@/shared/constants/routes';
import { useAuthStore } from '../store/auth-store';
import { LoginForm } from '../forms/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);
  const locationState: unknown = location.state;
  const stateFrom = typeof locationState === 'object' && locationState !== null && 'from' in locationState && typeof locationState.from === 'string' ? locationState.from : null;
  const requestedUrl = searchParams.get('returnUrl') ?? stateFrom;
  return <div><h2 className="text-xl font-semibold">Sign in</h2><p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">Use any valid credentials to access the mock workspace.</p><LoginForm onSuccess={(values) => { signIn(values.remember, values.email); void navigate(isSafeReturnUrl(requestedUrl) ? requestedUrl : routes.defaultWorkspace, { replace: true }); }} /><p className="mt-6 text-center text-sm text-slate-500">New here? <a className="font-medium text-indigo-600 hover:underline dark:text-indigo-400" href="/register">Create an account</a></p></div>;
}
