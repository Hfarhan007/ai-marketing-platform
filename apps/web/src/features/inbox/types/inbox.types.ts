export type Channel = 'email' | 'whatsapp' | 'sms' | 'facebook' | 'instagram' | 'website';
export type ConversationStatus = 'open' | 'closed';
export type MessageKind = 'message' | 'note';
export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'document' | 'image';
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'contact' | 'agent';
  senderName: string;
  kind: MessageKind;
  body: string;
  createdAt: string;
  status?: DeliveryStatus;
  attachments: Attachment[];
}

export interface InboxContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  lifecycle: string;
  tags: string[];
  lastSeen: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  channel: Channel;
  subject: string;
  preview: string;
  updatedAt: string;
  unread: number;
  status: ConversationStatus;
  assignee: string;
  labels: string[];
}
