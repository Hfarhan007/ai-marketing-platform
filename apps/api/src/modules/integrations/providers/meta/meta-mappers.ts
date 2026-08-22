import type { MetaLead, MetaWebhookPayload } from './meta.types.js';

export function metaLeadgenChanges(payload: MetaWebhookPayload) {
  const values: Array<{leadgenId:string;pageId?:string;formId?:string;createdAt:Date}> = [];
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    if (change.field !== 'leadgen' || typeof change.value?.leadgen_id !== 'string') continue;
    values.push({ leadgenId: change.value.leadgen_id, ...(typeof change.value.page_id === 'string' ? {pageId:change.value.page_id} : entry.id ? {pageId:entry.id} : {}), ...(typeof change.value.form_id === 'string' ? {formId:change.value.form_id} : {}), createdAt: typeof change.value.created_time === 'number' ? new Date(change.value.created_time * 1000) : new Date() });
  }
  return values;
}
export function metaLeadgenChange(payload: MetaWebhookPayload) { return metaLeadgenChanges(payload)[0] ?? null; }

export function mapMetaLead(lead: MetaLead) {
  const fields: Record<string, string> = {};
  for (const field of lead.field_data ?? []) fields[field.name] = field.values?.filter(Boolean).join(', ') ?? '';
  const fullName = fields.full_name ?? '', parts = fullName.trim().split(/\s+/u);
  return { externalLeadId: lead.id, firstName: fields.first_name ?? parts[0] ?? '', lastName: fields.last_name ?? (parts.length > 1 ? parts.slice(1).join(' ') : ''), fullName: fullName || [fields.first_name,fields.last_name].filter(Boolean).join(' '), email: fields.email ?? '', phone: fields.phone_number ?? '', company: fields.company_name ?? '', fields };
}
