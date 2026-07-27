import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import { twoFactorSchema, type TwoFactorValues } from '../schemas/auth.schemas';
import { useTwoFactorMutation } from '../hooks/use-auth-mutations';

export interface TwoFactorFormProps {
  onSuccess: () => void;
}

export function TwoFactorForm({ onSuccess }: TwoFactorFormProps) {
  const verification = useTwoFactorMutation();
  const { formState: { errors, isSubmitting }, handleSubmit, register, setError } = useForm<TwoFactorValues>({
    defaultValues: { code: '' },
    resolver: zodResolver(twoFactorSchema),
  });
  const submit = handleSubmit(async (values) => {
    try {
      await verification.mutateAsync(values.code);
      onSuccess();
    } catch {
      setError('code', { message: 'Use 123456 for this mock verification.' });
    }
  });
  return <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
    <Input autoComplete="one-time-code" error={errors.code?.message} inputMode="numeric" label="Verification code" maxLength={6} placeholder="000000" {...register('code')} />
    <Button loading={isSubmitting || verification.isPending} type="submit">Verify code</Button>
    <p className="text-center text-xs text-slate-500">Mock code: 123456</p>
  </form>;
}
