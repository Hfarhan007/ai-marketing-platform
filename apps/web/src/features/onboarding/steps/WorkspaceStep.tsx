import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@/shared/ui';
import { OnboardingStepLayout } from '../components/OnboardingStepLayout';
import { workspaceSchema, type WorkspaceValues } from '../schemas/onboarding.schemas';
import { useOnboardingStore } from '../store/onboarding-store';

export function WorkspaceStep() {
  const navigate = useNavigate();
  const data = useOnboardingStore((state) => state.data);
  const save = useOnboardingStore((state) => state.save);
  const { formState: { errors, isSubmitting }, handleSubmit, register } = useForm<WorkspaceValues>({
    defaultValues: { workspaceName: data.workspaceName, workspaceSlug: data.workspaceSlug },
    resolver: zodResolver(workspaceSchema),
  });
  const submit = handleSubmit(async (values) => {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    save(values, 1);
    void navigate('/onboarding/industry');
  });
  return <OnboardingStepLayout description="Name the shared space where your team will work." step={0} title="Create your workspace"><form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}><Input error={errors.workspaceName?.message} label="Workspace name" placeholder="Acme Studio" {...register('workspaceName')} /><Input error={errors.workspaceSlug?.message} label="Workspace URL" leading={<span className="text-xs">app/</span>} placeholder="acme-studio" {...register('workspaceSlug')} /><Button loading={isSubmitting} type="submit">Continue</Button></form></OnboardingStepLayout>;
}
