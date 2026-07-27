import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox } from '@/shared/ui';
import { OnboardingStepLayout } from '../components/OnboardingStepLayout';
import { goalsSchema, type GoalsValues } from '../schemas/onboarding.schemas';
import { useOnboardingStore } from '../store/onboarding-store';

const goals = [{ value: 'grow-audience', label: 'Grow an audience' }, { value: 'generate-demand', label: 'Generate demand' }, { value: 'improve-conversion', label: 'Improve conversion' }, { value: 'retain-customers', label: 'Retain customers' }, { value: 'automate-work', label: 'Automate repetitive work' }] as const;

export function GoalsStep() {
  const navigate = useNavigate();
  const data = useOnboardingStore((state) => state.data);
  const save = useOnboardingStore((state) => state.save);
  const { formState: { errors, isSubmitting }, handleSubmit, register } = useForm<GoalsValues>({ defaultValues: { goals: data.goals }, resolver: zodResolver(goalsSchema) });
  const submit = handleSubmit(async (values) => { await new Promise((resolve) => window.setTimeout(resolve, 300)); save(values, 3); void navigate('/onboarding/channels'); });
  return <OnboardingStepLayout description="Select up to four outcomes that matter most." step={2} title="What do you want to achieve?"><form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}><div className="grid gap-3 sm:grid-cols-2">{goals.map((goal) => <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700" key={goal.value}><Checkbox label={goal.label} value={goal.value} {...register('goals')} /></div>)}</div>{errors.goals ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{errors.goals.message}</p> : null}<div className="flex justify-between gap-3"><Button onClick={() => void navigate('/onboarding/industry')} variant="ghost">Back</Button><Button loading={isSubmitting} type="submit">Continue</Button></div></form></OnboardingStepLayout>;
}
