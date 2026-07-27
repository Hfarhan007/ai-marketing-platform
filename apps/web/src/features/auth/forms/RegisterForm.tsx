import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Checkbox, Input } from '@/shared/ui';
import { registerSchema, type RegisterValues } from '../schemas/auth.schemas';
import { PasswordInput } from '../components/PasswordInput';
import { SocialLogin } from '../components/SocialLogin';
import { PasswordStrength } from '../components/PasswordStrength';
import { useRegisterMutation } from '../hooks/use-auth-mutations';
import { MockAuthError } from '../api/mock-auth-api';

export interface RegisterFormProps {
  onSuccess: (values: RegisterValues) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const registration = useRegisterMutation();
  const { control, formState: { errors, isSubmitting }, handleSubmit, register, setError } = useForm<RegisterValues>({
    defaultValues: { confirmPassword: '', email: '', name: '', password: '', terms: false },
    resolver: zodResolver(registerSchema),
  });
  const password = useWatch({ control, name: 'password' });
  const submit = handleSubmit(async (values) => {
    try {
      await registration.mutateAsync({ email: values.email, name: values.name, password: values.password, remember: false });
      onSuccess(values);
    } catch (error) {
      setError('root', { message: error instanceof MockAuthError ? error.message : 'Registration could not be completed.' });
    }
  });
  return <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
    {errors.root ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">{errors.root.message}</div> : null}
    <Input autoComplete="name" error={errors.name?.message} label="Full name" {...register('name')} />
    <Input autoComplete="email" error={errors.email?.message} label="Email address" type="email" {...register('email')} />
    <div><PasswordInput autoComplete="new-password" error={errors.password?.message} label="Password" {...register('password')} /><PasswordStrength password={password} /></div>
    <PasswordInput autoComplete="new-password" error={errors.confirmPassword?.message} label="Confirm password" {...register('confirmPassword')} />
    <div><Checkbox description="You agree to the placeholder terms and privacy policy." label="I accept the terms" {...register('terms')} />{errors.terms ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.terms.message}</p> : null}</div>
    <Button loading={isSubmitting || registration.isPending} type="submit">Create account</Button>
    <SocialLogin />
  </form>;
}
