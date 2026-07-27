import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertDialog, Button, Input } from '@/shared/ui';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrength } from '../components/PasswordStrength';
import { useInviteMutation, useResetPasswordMutation, useTwoFactorMutation } from '../hooks/use-auth-mutations';
import {
  inviteSchema,
  recoveryCodeSchema,
  resetPasswordSchema,
  type InviteValues,
  type RecoveryCodeValues,
  type ResetPasswordValues,
} from '../schemas/auth.schemas';
import { useAuthStore } from '../store/auth-store';

function AuthState({ action, description, icon, title }: { action?: ReactNode; description: string; icon: ReactNode; title: string }) {
  return <div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{icon}</span><h1 className="mt-5 text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>{action ? <div className="mt-6">{action}</div> : null}</div>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const reset = useResetPasswordMutation();
  const navigate = useNavigate();
  const { control, formState: { errors }, handleSubmit, register, setError } = useForm<ResetPasswordValues>({ defaultValues: { confirmPassword: '', password: '' }, resolver: zodResolver(resetPasswordSchema) });
  const password = useWatch({ control, name: 'password' }) ?? '';
  const submit = handleSubmit(async (values) => {
    try { await reset.mutateAsync({ password: values.password, token: params.get('token') ?? 'mock-reset-token' }); void navigate('/login?reset=success'); }
    catch { setError('root', { message: 'This reset link is invalid or expired.' }); }
  });
  return <div><h1 className="text-xl font-semibold">Choose a new password</h1><p className="mb-6 mt-1 text-sm text-slate-500">Use a unique password you do not use elsewhere.</p><form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>{errors.root ? <p role="alert" className="text-sm text-red-600">{errors.root.message}</p> : null}<div><PasswordInput error={errors.password?.message} label="New password" {...register('password')} /><PasswordStrength password={password} /></div><PasswordInput error={errors.confirmPassword?.message} label="Confirm new password" {...register('confirmPassword')} /><Button loading={reset.isPending} type="submit">Reset password</Button></form></div>;
}

export function RecoveryCodePage() {
  const verify = useTwoFactorMutation();
  const navigate = useNavigate();
  const { formState: { errors }, handleSubmit, register, setError } = useForm<RecoveryCodeValues>({ defaultValues: { code: '' }, resolver: zodResolver(recoveryCodeSchema) });
  const submit = handleSubmit(async ({ code }) => { try { await verify.mutateAsync(code); void navigate('/app/demo-workspace/dashboard'); } catch { setError('code', { message: 'Use RECOVERY-2026 for this mock flow.' }); } });
  return <div><h1 className="text-xl font-semibold">Use a recovery code</h1><p className="mb-6 mt-1 text-sm text-slate-500">Recovery codes can only be used once in a real system.</p><form className="grid gap-4" onSubmit={(event) => void submit(event)}><Input autoComplete="one-time-code" error={errors.code?.message} label="Recovery code" {...register('code')} /><Button loading={verify.isPending} type="submit">Continue</Button><p className="text-center text-xs text-slate-500">Mock code: RECOVERY-2026</p></form></div>;
}

export function SessionExpiredPage() {
  return <AuthState action={<Button className="w-full" onClick={() => { window.location.href = '/login?reason=expired'; }}>Sign in again</Button>} description="Your session ended to protect your account. Your unsaved local drafts remain on this device." icon={<Clock3 />} title="Session expired" />;
}

export function AccountLockedPage() {
  return <AuthState action={<Link className="font-medium text-indigo-600 hover:underline dark:text-indigo-400" to="/forgot-password">Recover your account</Link>} description="Too many unsuccessful attempts temporarily locked this account. Try recovery or contact your workspace owner." icon={<LockKeyhole />} title="Account locked" />;
}

export function InviteAcceptancePage() {
  const [params] = useSearchParams();
  const invite = useInviteMutation();
  const navigate = useNavigate();
  const { control, formState: { errors }, handleSubmit, register, setError } = useForm<InviteValues>({ defaultValues: { confirmPassword: '', name: '', password: '' }, resolver: zodResolver(inviteSchema) });
  const password = useWatch({ control, name: 'password' }) ?? '';
  const submit = handleSubmit(async (values) => { try { await invite.mutateAsync({ name: values.name, password: values.password, token: params.get('token') ?? 'mock-invite' }); void navigate('/login?invite=accepted'); } catch { setError('root', { message: 'This invitation is invalid or expired.' }); } });
  return <div><h1 className="text-xl font-semibold">Join Acme Studio</h1><p className="mb-6 mt-1 text-sm text-slate-500">Accept your invitation and secure your account.</p><form className="grid gap-4" onSubmit={(event) => void submit(event)}>{errors.root ? <p role="alert" className="text-sm text-red-600">{errors.root.message}</p> : null}<Input error={errors.name?.message} label="Full name" {...register('name')} /><div><PasswordInput error={errors.password?.message} label="Create password" {...register('password')} /><PasswordStrength password={password} /></div><PasswordInput error={errors.confirmPassword?.message} label="Confirm password" {...register('confirmPassword')} /><Button loading={invite.isPending} type="submit">Accept invitation</Button></form></div>;
}

export function LogoutPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);
  return <><AuthState description="Choose whether to end your session on this device." icon={<AlertTriangle />} title="Sign out?" /><AlertDialog confirmLabel="Sign out" description="You will need to authenticate again to access your workspace." onClose={() => { setOpen(false); void navigate(-1); }} onConfirm={() => { signOut(); void navigate('/login', { replace: true }); }} open={open} title="Confirm sign out" /></>;
}

export function EmailVerifiedPage() {
  return <AuthState action={<Link className="font-medium text-indigo-600 hover:underline" to="/login">Continue to sign in</Link>} description="Your email address has been verified successfully." icon={<CheckCircle2 />} title="Email verified" />;
}
