import type { NodeCategory, WorkflowNodeDefinition } from '../types/workflow.types';

const define = (category: NodeCategory, items: Array<[string, string, string]>): WorkflowNodeDefinition[] =>
  items.map(([type, label, description]) => ({ category, type, label, description }));

export const nodeCatalog: WorkflowNodeDefinition[] = [
  ...define('trigger', [
    ['lead-created', 'Lead created', 'Starts when a new lead enters the workspace.'],
    ['form-submitted', 'Form submitted', 'Starts after a selected form receives a response.'],
    ['message-received', 'Message received', 'Starts when a contact sends a new message.'],
    ['appointment-booked', 'Appointment booked', 'Starts when an appointment is confirmed.'],
    ['deal-stage-changed', 'Deal stage changed', 'Starts when a deal moves between pipeline stages.'],
  ]),
  ...define('action', [
    ['send-email', 'Send email', 'Sends a configured email to the contact.'],
    ['send-sms', 'Send SMS', 'Sends an SMS message to the contact.'],
    ['send-whatsapp', 'Send WhatsApp', 'Sends a WhatsApp template message.'],
    ['add-tag', 'Add tag', 'Adds a tag to the contact record.'],
    ['remove-tag', 'Remove tag', 'Removes a tag from the contact record.'],
    ['assign-user', 'Assign user', 'Assigns a team member as owner.'],
    ['create-task', 'Create task', 'Creates a follow-up task.'],
    ['update-contact', 'Update contact', 'Updates selected contact fields.'],
  ]),
  ...define('logic', [
    ['condition', 'Condition', 'Branches based on field or activity rules.'],
    ['delay', 'Delay', 'Waits for a defined duration.'],
    ['split', 'Split', 'Distributes contacts across paths.'],
    ['wait-until', 'Wait until', 'Waits until a date or condition is reached.'],
    ['stop-workflow', 'Stop workflow', 'Ends execution for the current contact.'],
  ]),
  ...define('ai', [
    ['qualify-lead', 'Qualify lead', 'Scores and classifies a lead using mock AI.'],
    ['generate-reply', 'Generate reply', 'Creates a contextual response draft.'],
    ['summarize-conversation', 'Summarize conversation', 'Produces a concise conversation summary.'],
    ['extract-data', 'Extract structured data', 'Maps message content into selected fields.'],
  ]),
];
