import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Button, Checkbox, Input, Select, Stepper, Textarea } from '@/shared/ui';
import { onboardingSchema, type OnboardingValues } from '../schemas/onboarding.schemas';
import { useOnboardingStore } from '../store/onboarding-store';

const steps = ['Workspace', 'Goals & channels', 'Localization', 'Team', 'Branding', 'Review'] as const;
const stepFields: readonly (readonly (keyof OnboardingValues)[])[] = [
  ['workspaceName', 'workspaceSlug', 'industry', 'businessType', 'companySize'],
  ['goals', 'channels'],
  ['timezone', 'locale', 'currency'],
  ['teamEmails'],
  ['brandColor', 'logoName'],
  [],
];
const paths = ['/onboarding/workspace', '/onboarding/goals', '/onboarding/channels', '/onboarding/team', '/onboarding/branding', '/onboarding/summary'] as const;
const select = (values: readonly string[]) => values.map((value) => ({ label: value, value: value.toLowerCase().replaceAll(' ', '-') }));

export function OnboardingWizard() {
  const navigate = useNavigate();
  const stored = useOnboardingStore((state) => state.data);
  const storedStep = useOnboardingStore((state) => state.currentStep);
  const save = useOnboardingStore((state) => state.save);
  const discard = useOnboardingStore((state) => state.discard);
  const complete = useOnboardingStore((state) => state.setCompleted);
  const [step, setStep] = useState(Math.min(storedStep, steps.length - 1));
  const [discardOpen, setDiscardOpen] = useState(false);
  const defaults = useMemo<OnboardingValues>(() => ({ ...stored, teamEmails: stored.teamEmails.join(', ') }), [stored]);
  const { formState: { errors, isSubmitting }, getValues, handleSubmit, register, trigger } = useForm<OnboardingValues>({ defaultValues: defaults, resolver: zodResolver(onboardingSchema) });
  const progress = Math.round(((step + 1) / steps.length) * 100);

  const persist = (nextStep = step) => {
    const values = getValues();
    save({ ...values, teamEmails: values.teamEmails.split(/[\n,]/).map((email) => email.trim()).filter(Boolean) }, nextStep);
  };
  const go = async (next: number) => {
    if (next > step && !(await trigger(stepFields[step]))) return;
    persist(next);
    setStep(next);
    void navigate(paths[next] ?? paths[0], { replace: true });
  };
  const finish = handleSubmit((values) => {
    save({ ...values, teamEmails: values.teamEmails.split(/[\n,]/).map((email) => email.trim()).filter(Boolean) }, steps.length - 1);
    complete();
    void navigate('/app/demo-workspace/dashboard', { replace: true });
  });

  return <main className="min-h-dvh bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950" dir="auto"><section className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-indigo-600">Workspace setup</p><h1 className="text-2xl font-bold">Tell us about your business</h1></div><div className="flex gap-2"><Button onClick={() => { persist(); }} size="sm" variant="outline"><Save size={16} />Save draft</Button><Button onClick={() => setDiscardOpen(true)} size="sm" variant="ghost"><Trash2 size={16} />Discard</Button></div></div>
    <div className="mt-6"><div className="mb-2 flex justify-between text-sm"><span>Step {step + 1} of {steps.length}</span><span>{progress}% complete</span></div><div aria-label={`${progress}% complete`} className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}><div className="h-full bg-indigo-600 transition-[width]" style={{ width: `${progress}%` }} /></div><div className="mt-5 hidden md:block"><Stepper currentStep={step} items={steps.map((label) => ({ label }))} /></div></div>
    <form className="mx-auto mt-8 max-w-2xl" noValidate onSubmit={(event) => void finish(event)}>
      {step === 0 ? <fieldset className="grid gap-5"><legend className="mb-4 text-xl font-semibold">Workspace details</legend><Input error={errors.workspaceName?.message} label="Workspace name" {...register('workspaceName')} /><Input error={errors.workspaceSlug?.message} label="Workspace URL" leading={<span className="text-xs">app/</span>} {...register('workspaceSlug')} /><Select error={errors.industry?.message} label="Industry" options={select(['Agency', 'E-commerce', 'Education', 'Financial services', 'Healthcare', 'SaaS', 'Other'])} placeholder="Select industry" {...register('industry')} /><Select error={errors.businessType?.message} label="Business type" options={select(['B2B', 'B2C', 'Marketplace', 'Nonprofit', 'Other'])} placeholder="Select type" {...register('businessType')} /><Select error={errors.companySize?.message} label="Company size" options={select(['1-10', '11-50', '51-200', '201-1000', '1000+'])} placeholder="Select size" {...register('companySize')} /></fieldset> : null}
      {step === 1 ? <fieldset><legend className="mb-4 text-xl font-semibold">Goals and channels</legend><p className="mb-3 text-sm font-medium">Goals (choose up to four)</p><div className="grid gap-3 sm:grid-cols-2">{['Grow audience', 'Generate demand', 'Improve conversion', 'Retain customers', 'Automate work'].map((label) => <Checkbox key={label} label={label} value={label.toLowerCase().replaceAll(' ', '-')} {...register('goals')} />)}</div>{errors.goals ? <p className="mt-2 text-sm text-red-600" role="alert">{errors.goals.message}</p> : null}<p className="mb-3 mt-6 text-sm font-medium">Selected channels</p><div className="grid gap-3 sm:grid-cols-2">{['Email', 'Website', 'WhatsApp', 'SMS', 'Social media', 'Paid advertising'].map((label) => <Checkbox key={label} label={label} value={label.toLowerCase().replaceAll(' ', '-')} {...register('channels')} />)}</div>{errors.channels ? <p className="mt-2 text-sm text-red-600" role="alert">{errors.channels.message}</p> : null}</fieldset> : null}
      {step === 2 ? <fieldset className="grid gap-5"><legend className="mb-4 text-xl font-semibold">Localization</legend><Select error={errors.timezone?.message} label="Timezone" options={[{ label: 'Asia/Karachi (UTC+5)', value: 'Asia/Karachi' }, { label: 'UTC', value: 'UTC' }, { label: 'America/New York', value: 'America/New_York' }, { label: 'Europe/London', value: 'Europe/London' }]} {...register('timezone')} /><Select label="Language and locale" options={[{ label: 'English', value: 'en' }, { label: 'Urdu', value: 'ur' }, { label: 'Arabic', value: 'ar' }]} {...register('locale')} /><Select label="Currency" options={[{ label: 'USD — US Dollar', value: 'USD' }, { label: 'PKR — Pakistani Rupee', value: 'PKR' }, { label: 'EUR — Euro', value: 'EUR' }, { label: 'AED — UAE Dirham', value: 'AED' }]} {...register('currency')} /></fieldset> : null}
      {step === 3 ? <fieldset><legend className="mb-4 text-xl font-semibold">Invite your team</legend><Textarea error={errors.teamEmails?.message} label="Team email addresses" rows={6} {...register('teamEmails')} /><p className="mt-1 text-xs text-slate-500">Optional. Separate addresses with commas or new lines.</p></fieldset> : null}
      {step === 4 ? <fieldset className="grid gap-5"><legend className="mb-4 text-xl font-semibold">Branding</legend><Input error={errors.brandColor?.message} label="Brand color" type="color" {...register('brandColor')} /><div><Input label="Logo name" placeholder="Acme logo" {...register('logoName')} /><p className="mt-1 text-xs text-slate-500">Optional display name for a future uploaded asset.</p></div></fieldset> : null}
      {step === 5 ? <section><h2 className="text-xl font-semibold">Review and complete</h2><p className="mt-1 text-sm text-slate-500">Confirm your saved setup before entering the workspace.</p><dl className="mt-5 grid gap-4 rounded-xl border border-slate-200 p-5 sm:grid-cols-2 dark:border-slate-700">{Object.entries(getValues()).map(([key, value]) => <div key={key}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key.replaceAll(/([A-Z])/g, ' $1')}</dt><dd className="mt-1 break-words text-sm">{Array.isArray(value) ? value.join(', ') || 'Not provided' : value || 'Not provided'}</dd></div>)}</dl></section> : null}
      <div className="mt-8 flex flex-wrap justify-between gap-3"><Button disabled={step === 0 || isSubmitting} onClick={() => void go(step - 1)} variant="ghost">Back</Button>{step < steps.length - 1 ? <Button onClick={() => void go(step + 1)}>Next</Button> : <Button loading={isSubmitting} type="submit">Complete setup</Button>}</div>
    </form>
  </section><AlertDialog confirmLabel="Discard draft" description="All locally saved onboarding answers will be removed." onClose={() => setDiscardOpen(false)} onConfirm={() => { discard(); setDiscardOpen(false); setStep(0); void navigate(paths[0], { replace: true }); }} open={discardOpen} title="Discard onboarding draft?" /></main>;
}
