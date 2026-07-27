export type AgentStatus = 'active' | 'draft' | 'paused';
export type AgentChannel = 'website' | 'email' | 'whatsapp' | 'sms' | 'instagram' | 'messenger';
export type AgentTone = 'professional' | 'friendly' | 'concise' | 'empathetic';

export interface EscalationRule {
  id: string;
  condition: string;
  action: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  status: AgentStatus;
  language: string;
  tone: AgentTone;
  systemInstructions: string;
  welcomeMessage: string;
  provider: 'OpenAI' | 'Google' | 'Groq' | 'Mock';
  model: string;
  temperature: number;
  responseLength: 'short' | 'medium' | 'long';
  channels: AgentChannel[];
  tools: string[];
  escalationRules: EscalationRule[];
  businessHours: string;
  fallbackResponse: string;
  knowledgeSourceIds: string[];
  conversations: number;
  resolutionRate: number;
}

export type KnowledgeKind = 'document' | 'website' | 'faq' | 'collection';
export type ProcessingStatus = 'ready' | 'processing' | 'failed';

export interface KnowledgeSource {
  id: string;
  kind: KnowledgeKind;
  name: string;
  description: string;
  status: ProcessingStatus;
  updatedAt: string;
  size?: string;
  url?: string;
  items?: number;
}
