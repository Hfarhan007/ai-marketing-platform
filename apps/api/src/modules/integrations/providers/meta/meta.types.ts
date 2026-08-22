export interface MetaField { name: string; values?: string[] }
export interface MetaLead { id: string; created_time?: string; field_data?: MetaField[]; form_id?: string; ad_id?: string; adset_id?: string; campaign_id?: string }
export interface MetaWebhookPayload { object?: string; entry?: Array<{ id?: string; time?: number; changes?: Array<{ field?: string; value?: Record<string, unknown> }> }> }
export interface StoredMetaWebhookPayload extends MetaWebhookPayload { _normalizedLeadgen?: { leadgenId:string;pageId?:string;formId?:string;createdAt:string } }
