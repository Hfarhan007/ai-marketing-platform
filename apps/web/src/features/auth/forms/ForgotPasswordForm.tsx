import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/auth.schemas';
import { useForgotPasswordMutation } from '../hooks/use-auth-mutations';

export function ForgotPasswordForm() {
  const requestReset = useForgotPasswordMutation();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { formState: { errors, isSubmitting }, handleSubmit, register, setError } = useForm<ForgotPasswordValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(forgotPasswordSchema),
  });
  const submit = handleSubmit(async (values) => {
    try {
      await requestReset.mutateAsync(values.email);
      setSentTo(values.email);
    } catch {
      setError('root', { message: 'The reset request could not be completed.' });
    }
  });
  if (sentTo) return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" role="status">Mock reset instructions were sent to <strong>{sentTo}</strong>.</div>;
  return <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
    {errors.root ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">{errors.root.message}</div> : null}
    <Input autoComplete="email" error={errors.email?.message} label="Email address" placeholder="name@example.com" type="email" {...register('email')} />
    <Button loading={isSubmitting || requestReset.isPending} type="submit">Send reset instructions</Button>
  </form>;
}
