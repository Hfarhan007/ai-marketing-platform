import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Textarea } from '@/shared/ui';
import { OnboardingStepLayout } from '../components/OnboardingStepLayout';
import { teamSchema, type TeamValues } from '../schemas/onboarding.schemas';
import { useOnboardingStore } from '../store/onboarding-store';

export function TeamStep() {
  const navigate = useNavigate();
  const data = useOnboardingStore((state) => state.data);
  const save = useOnboardingStore((state) => state.save);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);
  const { formState: { errors, isSubmitting }, handleSubmit, register } = useForm<TeamValues>({ defaultValues: { emails: data.teamEmails.join(', ') }, resolver: zodResolver(teamSchema) });
  const finish = async (values: TeamValues) => {
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    const teamEmails = values.emails.split(/[\n,]/).map((email) => email.trim()).filter(Boolean);
    save({ teamEmails }, 5);
    setCompleted();
    void navigate('/app/demo-workspace/dashboard');
  };
  const submit = handleSubmit(finish);
  return <OnboardingStepLayout description="Invite collaborators now, or safely skip this optional step." step={4} title="Bring your team"><form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}><Textarea error={errors.emails?.message} label="Team email addresses" placeholder={'alex@example.com\nsam@example.com'} rows={5} {...register('emails')} /><div className="flex flex-wrap justify-between gap-3"><Button onClick={() => void navigate('/onboarding/channels')} variant="ghost">Back</Button><div className="flex gap-2"><Button disabled={isSubmitting} onClick={() => void finish({ emails: '' })} variant="ghost">Skip</Button><Button loading={isSubmitting} type="submit">Finish setup</Button></div></div></form></OnboardingStepLayout>;
}
