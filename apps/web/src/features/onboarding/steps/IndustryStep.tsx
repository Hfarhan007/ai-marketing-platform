import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Select } from '@/shared/ui';
import { OnboardingStepLayout } from '../components/OnboardingStepLayout';
import { industrySchema, type IndustryValues } from '../schemas/onboarding.schemas';
import { useOnboardingStore } from '../store/onboarding-store';

const industries = ['Agency', 'E-commerce', 'Education', 'Financial services', 'Healthcare', 'SaaS', 'Other'].map((label) => ({ label, value: label.toLowerCase().replaceAll(' ', '-') }));

export function IndustryStep() {
  const navigate = useNavigate();
  const data = useOnboardingStore((state) => state.data);
  const save = useOnboardingStore((state) => state.save);
  const { formState: { errors, isSubmitting }, handleSubmit, register } = useForm<IndustryValues>({ defaultValues: { industry: data.industry }, resolver: zodResolver(industrySchema) });
  const submit = handleSubmit(async (values) => { await new Promise((resolve) => window.setTimeout(resolve, 300)); save(values, 2); void navigate('/onboarding/goals'); });
  return <OnboardingStepLayout description="This helps tailor the initial workspace experience." step={1} title="What industry are you in?"><form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}><Select error={errors.industry?.message} label="Industry" options={industries} placeholder="Select an industry" {...register('industry')} /><div className="flex justify-between gap-3"><Button onClick={() => void navigate('/onboarding/workspace')} variant="ghost">Back</Button><Button loading={isSubmitting} type="submit">Continue</Button></div></form></OnboardingStepLayout>;
}
