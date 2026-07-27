import { ForgotPasswordForm } from '../forms/ForgotPasswordForm';

export function ForgotPasswordPage() {
  return <div><h2 className="text-xl font-semibold">Reset your password</h2><p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">We will simulate sending recovery instructions.</p><ForgotPasswordForm /><p className="mt-6 text-center text-sm"><a className="font-medium text-indigo-600 hover:underline dark:text-indigo-400" href="/login">Back to sign in</a></p></div>;
}
