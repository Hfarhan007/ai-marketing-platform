import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input } from '@/shared/ui';
import { loginSchema, type LoginValues } from '../schemas/auth.schemas';
import { PasswordInput } from '../components/PasswordInput';
import { SocialLogin } from '../components/SocialLogin';
import { useLoginMutation } from '../hooks/use-auth-mutations';
import { MockAuthError } from '../api/mock-auth-api';

export interface LoginFormProps {
  onSuccess: (values: LoginValues) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useLoginMutation();
  const { formState: { errors, isSubmitting }, handleSubmit, register, setError } = useForm<LoginValues>({
    defaultValues: { email: '', password: '', remember: false },
    resolver: zodResolver(loginSchema),
  });
  const submit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      onSuccess(values);
    } catch (error) {
      setError('root', { message: error instanceof MockAuthError ? error.message : 'Sign-in could not be completed.' });
    }
  });
  return <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
    {errors.root ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">{errors.root.message}</div> : null}
    <Input autoComplete="email" error={errors.email?.message} label="Email address" placeholder="name@example.com" type="email" {...register('email')} />
    <PasswordInput autoComplete="current-password" error={errors.password?.message} label="Password" {...register('password')} />
    <div className="flex flex-wrap items-center justify-between gap-3"><Checkbox label="Remember me" {...register('remember')} /><a className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400" href="/forgot-password">Forgot password?</a></div>
    <Button loading={isSubmitting || login.isPending} type="submit">Sign in</Button>
    <SocialLogin />
  </form>;
}
