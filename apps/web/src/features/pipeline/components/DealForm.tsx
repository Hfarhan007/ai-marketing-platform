import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input, Select, Textarea } from '@/shared/ui';
import { dealSchema, type DealFormValues } from '../schemas/deal.schema';
import type { Deal, DealInput, PipelineStage } from '../types/pipeline.types';

const sources = ['Organic', 'Webinar', 'Referral', 'LinkedIn', 'Partner', 'Paid social', 'Conference'].map((value) => ({ label: value, value }));
const owners = ['Alex Morgan', 'Jordan Lee', 'Sam Rivera'].map((value) => ({ label: value, value }));

export function DealForm({ deal, initialStage, onCancel, onDelete, onSubmit, stages }: { deal?: Deal; initialStage?: string; onCancel: () => void; onDelete?: () => void; onSubmit: (input: DealInput) => void; stages: readonly PipelineStage[] }) {
  const { formState: { errors }, handleSubmit, register } = useForm<DealFormValues>({ resolver: zodResolver(dealSchema), defaultValues: {
    contact: deal?.contact ?? '', company: deal?.company ?? '', value: deal?.value ?? 10000, source: deal?.source ?? '', assignee: deal?.assignee ?? '',
    stageId: deal?.stageId ?? (initialStage as DealFormValues['stageId'] | undefined) ?? 'new-lead', tagsText: deal?.tags.join(', ') ?? '',
    nextActivity: deal?.nextActivity ?? 'Follow-up call', leadScore: deal?.leadScore ?? 50,
    expectedCloseDate: deal?.expectedCloseDate ?? '2026-08-22', lostReason: deal?.lostReason ?? '',
  } });
  const submit = (values: DealFormValues) => onSubmit({
    contact: values.contact, company: values.company, value: values.value, source: values.source, assignee: values.assignee, stageId: values.stageId,
    tags: values.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean), nextActivity: values.nextActivity, lastActivity: new Date().toISOString(),
    leadScore: values.leadScore, expectedCloseDate: values.expectedCloseDate, ...(values.lostReason ? { lostReason: values.lostReason } : {}),
  });
  return <form className="grid gap-4" onSubmit={(event) => void handleSubmit(submit)(event)}><div className="grid gap-4 sm:grid-cols-2"><Input error={errors.contact?.message} label="Contact" {...register('contact')} /><Input error={errors.company?.message} label="Company" {...register('company')} /><Input error={errors.value?.message} label="Deal value" min="0" step="100" type="number" {...register('value', { valueAsNumber: true })} /><Select error={errors.stageId?.message} label="Stage" options={stages.map(({ id, name }) => ({ label: name, value: id }))} {...register('stageId')} /><Select error={errors.source?.message} label="Source" options={sources} placeholder="Select source" {...register('source')} /><Select error={errors.assignee?.message} label="Assigned user" options={owners} placeholder="Select owner" {...register('assignee')} /><Input error={errors.leadScore?.message} label="Lead score" max="100" min="0" type="number" {...register('leadScore', { valueAsNumber: true })} /><Input error={errors.expectedCloseDate?.message} label="Expected close" type="date" {...register('expectedCloseDate')} /></div><Input label="Tags" placeholder="Enterprise, Priority" {...register('tagsText')} /><Input error={errors.nextActivity?.message} label="Next activity" {...register('nextActivity')} /><Textarea label="Lost reason" placeholder="Required when marking a deal lost" rows={3} {...register('lostReason')} /><div className="flex gap-2"><Button onClick={onCancel} type="button" variant="ghost">Cancel</Button>{onDelete ? <Button className="mr-auto" onClick={onDelete} type="button" variant="danger">Delete</Button> : <span className="mr-auto" />}<Button type="submit">{deal ? 'Save deal' : 'Create deal'}</Button></div></form>;
}
