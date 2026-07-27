import type { Conversation, InboxContact, Message } from '../types/inbox.types';

export const inboxContacts: InboxContact[] = [
  { id: 'c1', name: 'Olivia Martin', email: 'olivia@northstarlabs.com', phone: '+44 20 7946 0192', company: 'Northstar Labs', location: 'London, UK', lifecycle: 'Qualified lead', tags: ['Enterprise', 'High intent'], lastSeen: '2026-07-23T09:41:00.000Z' },
  { id: 'c2', name: 'Ethan Clark', email: 'ethan@lumondigital.com', phone: '+1 512 555 0162', company: 'Lumon Digital', location: 'Austin, TX', lifecycle: 'Customer', tags: ['Customer', 'Expansion'], lastSeen: '2026-07-23T08:20:00.000Z' },
  { id: 'c3', name: 'Sophia Patel', email: 'sophia@aperture.studio', phone: '+1 416 555 0138', company: 'Aperture Studio', location: 'Toronto, CA', lifecycle: 'Lead', tags: ['Inbound'], lastSeen: '2026-07-22T18:12:00.000Z' },
  { id: 'c4', name: 'Noah Williams', email: 'noah@vertexcloud.io', phone: '+49 30 555 0191', company: 'Vertex Cloud', location: 'Berlin, DE', lifecycle: 'Qualified lead', tags: ['Priority'], lastSeen: '2026-07-23T10:02:00.000Z' },
  { id: 'c5', name: 'Mia Chen', email: 'mia@pioneerworks.sg', phone: '+65 6555 0184', company: 'Pioneer Works', location: 'Singapore', lifecycle: 'Customer', tags: ['Customer'], lastSeen: '2026-07-21T16:35:00.000Z' },
  { id: 'c6', name: 'Liam Davis', email: 'liam@orbitsystems.com', phone: '+1 303 555 0109', company: 'Orbit Systems', location: 'Denver, CO', lifecycle: 'Lead', tags: ['Nurture'], lastSeen: '2026-07-20T12:15:00.000Z' },
];

export const initialConversations: Conversation[] = [
  { id: 'conv-1', contactId: 'c1', channel: 'email', subject: 'Enterprise plan and onboarding', preview: 'Could you share the rollout timeline?', updatedAt: '2026-07-23T09:42:00.000Z', unread: 2, status: 'open', assignee: 'Alex Morgan', labels: ['Sales', 'Priority'] },
  { id: 'conv-2', contactId: 'c2', channel: 'whatsapp', subject: 'Campaign performance question', preview: 'That makes sense, thank you!', updatedAt: '2026-07-23T08:22:00.000Z', unread: 0, status: 'open', assignee: 'Jordan Lee', labels: ['Support'] },
  { id: 'conv-3', contactId: 'c3', channel: 'sms', subject: 'Demo confirmation', preview: 'Thursday at 2pm works for me.', updatedAt: '2026-07-22T18:15:00.000Z', unread: 1, status: 'open', assignee: 'Sam Rivera', labels: ['Demo'] },
  { id: 'conv-4', contactId: 'c4', channel: 'facebook', subject: 'Integration availability', preview: 'Do you support our existing CRM?', updatedAt: '2026-07-23T10:04:00.000Z', unread: 3, status: 'open', assignee: 'Unassigned', labels: ['Product'] },
  { id: 'conv-5', contactId: 'c5', channel: 'instagram', subject: 'Template request', preview: 'Love the new templates!', updatedAt: '2026-07-21T16:40:00.000Z', unread: 0, status: 'closed', assignee: 'Alex Morgan', labels: ['Feedback'] },
  { id: 'conv-6', contactId: 'c6', channel: 'website', subject: 'Pricing for a small team', preview: 'We have eight seats to start.', updatedAt: '2026-07-20T12:18:00.000Z', unread: 0, status: 'closed', assignee: 'Jordan Lee', labels: ['Sales'] },
];

export const initialMessages: Message[] = initialConversations.flatMap((conversation, index) => {
  const contact = inboxContacts.find(({ id }) => id === conversation.contactId)!;
  return [
    { id: `${conversation.id}-1`, conversationId: conversation.id, sender: 'contact', senderName: contact.name, kind: 'message', body: index === 0 ? 'Hi! We are evaluating the enterprise plan for our marketing team.' : conversation.preview, createdAt: '2026-07-23T08:30:00.000Z', attachments: index === 0 ? [{ id: 'att-1', name: 'requirements.pdf', size: '1.8 MB', type: 'document' }] : [] },
    { id: `${conversation.id}-2`, conversationId: conversation.id, sender: 'agent', senderName: conversation.assignee === 'Unassigned' ? 'Support team' : conversation.assignee, kind: 'message', body: 'Thanks for reaching out. I’d be happy to help and walk you through the next steps.', createdAt: '2026-07-23T08:36:00.000Z', status: 'read', attachments: [] },
    { id: `${conversation.id}-3`, conversationId: conversation.id, sender: 'contact', senderName: contact.name, kind: 'message', body: conversation.preview, createdAt: conversation.updatedAt, attachments: [] },
  ];
});
