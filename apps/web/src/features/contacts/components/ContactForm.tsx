import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input, Select } from '@/shared/ui';
import { contactSchema, type ContactFormValues } from '../schemas/contact.schema';
import type { Contact, ContactInput } from '../types/contacts.types';

const statusOptions = ['lead', 'qualified', 'customer', 'inactive'].map((value) => ({ label: value[0]!.toUpperCase() + value.slice(1), value }));
const sourceOptions = ['Organic search', 'Webinar', 'Referral', 'LinkedIn', 'Partner', 'Paid social', 'Conference'].map((value) => ({ label: value, value }));
const assigneeOptions = ['Alex Morgan', 'Jordan Lee', 'Sam Rivera'].map((value) => ({ label: value, value }));
const consentOptions = ['granted', 'pending', 'revoked'].map((value) => ({ label: value[0]!.toUpperCase() + value.slice(1), value }));

function defaults(contact?: Contact): ContactFormValues {
  return {
    firstName: contact?.firstName ?? '', lastName: contact?.lastName ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '',
    company: contact?.company ?? '', jobTitle: contact?.jobTitle ?? '', status: contact?.status ?? 'lead', leadSource: contact?.leadSource ?? '',
    assignee: contact?.assignee ?? '', location: contact?.location ?? '', tagsText: contact?.tags.join(', ') ?? '', consentStatus: contact?.consentStatus ?? 'pending',
    emailPreference: contact?.communicationPreferences.email ?? true, phonePreference: contact?.communicationPreferences.phone ?? false,
    smsPreference: contact?.communicationPreferences.sms ?? false, customerTier: contact?.customFields.customerTier ?? '', annualValue: contact?.customFields.annualValue ?? '',
  };
}

export function ContactForm({ contact, loading = false, onCancel, onSubmit }: { contact?: Contact; loading?: boolean; onCancel: () => void; onSubmit: (input: ContactInput) => void }) {
  const { formState: { errors }, handleSubmit, register } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema), defaultValues: defaults(contact) });
  const submit = (values: ContactFormValues) => onSubmit({
    firstName: values.firstName, lastName: values.lastName, email: values.email, phone: values.phone, company: values.company,
    jobTitle: values.jobTitle, status: values.status, leadSource: values.leadSource, assignee: values.assignee, location: values.location,
    tags: values.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean), consentStatus: values.consentStatus,
    communicationPreferences: { email: values.emailPreference, phone: values.phonePreference, sms: values.smsPreference },
    customFields: { customerTier: values.customerTier, annualValue: values.annualValue },
    ...(contact ? { version: contact.version } : {}),
  });
  return <form className="grid gap-5" onSubmit={(event) => void handleSubmit(submit)(event)}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Input error={errors.firstName?.message} label="First name" {...register('firstName')} />
      <Input error={errors.lastName?.message} label="Last name" {...register('lastName')} />
      <Input error={errors.email?.message} label="Email" type="email" {...register('email')} />
      <Input error={errors.phone?.message} label="Phone" {...register('phone')} />
      <Input error={errors.company?.message} label="Company" {...register('company')} />
      <Input error={errors.jobTitle?.message} label="Job title" {...register('jobTitle')} />
      <Select error={errors.status?.message} label="Lifecycle status" options={statusOptions} {...register('status')} />
      <Select error={errors.leadSource?.message} label="Lead source" options={sourceOptions} placeholder="Select source" {...register('leadSource')} />
      <Select error={errors.assignee?.message} label="Assigned team member" options={assigneeOptions} placeholder="Select teammate" {...register('assignee')} />
      <Select error={errors.consentStatus?.message} label="Consent status" options={consentOptions} {...register('consentStatus')} />
      <Input error={errors.location?.message} label="Location" {...register('location')} />
      <Input label="Tags" placeholder="Enterprise, High intent" {...register('tagsText')} />
    </div>
    <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">Communication preferences</legend><div className="mt-2 grid gap-3 sm:grid-cols-3"><Checkbox label="Email" {...register('emailPreference')} /><Checkbox label="Phone" {...register('phonePreference')} /><Checkbox label="SMS" {...register('smsPreference')} /></div></fieldset>
    <fieldset className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2"><legend className="px-1 text-sm font-semibold">Custom fields</legend><Input label="Customer tier" {...register('customerTier')} /><Input label="Annual value" placeholder="$50,000" {...register('annualValue')} /></fieldset>
    <div className="flex justify-end gap-2"><Button disabled={loading} onClick={onCancel} type="button" variant="ghost">Cancel</Button><Button loading={loading} type="submit">{contact ? 'Save changes' : 'Create contact'}</Button></div>
  </form>;
}
