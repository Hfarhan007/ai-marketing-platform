import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox } from '@/shared/ui';
import { OnboardingStepLayout } from '../components/OnboardingStepLayout';
import { channelsSchema, type ChannelsValues } from '../schemas/onboarding.schemas';
import { useOnboardingStore } from '../store/onboarding-store';

const channels = ['Email', 'Website', 'Social media', 'Paid advertising', 'Events', 'Messaging'] as const;

export function ChannelsStep() {
  const navigate = useNavigate();
  const data = useOnboardingStore((state) => state.data);
  const save = useOnboardingStore((state) => state.save);
  const { formState: { errors, isSubmitting }, handleSubmit, register } = useForm<ChannelsValues>({ defaultValues: { channels: data.channels }, resolver: zodResolver(channelsSchema) });
  const submit = handleSubmit(async (values) => { await new Promise((resolve) => window.setTimeout(resolve, 300)); save(values, 4); void navigate('/onboarding/team'); });
  return <OnboardingStepLayout description="Choose the places your team currently reaches customers." step={3} title="Select your channels"><form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}><div className="grid gap-3 sm:grid-cols-2">{channels.map((channel) => <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700" key={channel}><Checkbox label={channel} value={channel.toLowerCase()} {...register('channels')} /></div>)}</div>{errors.channels ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{errors.channels.message}</p> : null}<div className="flex justify-between gap-3"><Button onClick={() => void navigate('/onboarding/goals')} variant="ghost">Back</Button><Button loading={isSubmitting} type="submit">Continue</Button></div></form></OnboardingStepLayout>;
}
