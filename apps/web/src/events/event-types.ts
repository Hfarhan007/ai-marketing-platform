export interface ApplicationEventMap {
  'appointment.booked': { appointmentId: string };
  'contact.created': { contactId: string };
  'conversation.assigned': { conversationId: string; userId: string };
  'deal.stage_changed': { dealId: string; stage: string };
  'notification.received': { notificationId: string };
  'workflow.published': { workflowId: string };
}
