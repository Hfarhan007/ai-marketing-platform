export const CUSTOM_FIELD_ENTITIES = [
  'contacts',
  'companies',
  'leads',
  'deals',
  'tasks',
  'appointments',
] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

export const CUSTOM_FIELD_TYPES = [
  'text',
  'long_text',
  'number',
  'currency',
  'percentage',
  'boolean',
  'date',
  'datetime',
  'single_select',
  'multi_select',
  'user',
  'relationship',
  'url',
  'email',
  'phone',
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export type CustomFieldValues = Record<string, unknown>;

export interface CustomFieldRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}
