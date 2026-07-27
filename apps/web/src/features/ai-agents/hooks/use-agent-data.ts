import { useEffect, useState } from 'react';
import { initialAgents, initialKnowledgeSources } from '../mocks/agent.data';
import type { Agent, KnowledgeSource } from '../types/agent.types';

const AGENTS_KEY = 'crm:agents:v1';
const KNOWLEDGE_KEY = 'crm:knowledge:v1';
const read = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };

export function useAgentData() {
  const [agents, setAgents] = useState<Agent[]>(() => read(AGENTS_KEY, initialAgents));
  const [sources, setSources] = useState<KnowledgeSource[]>(() => read(KNOWLEDGE_KEY, initialKnowledgeSources));
  useEffect(() => localStorage.setItem(AGENTS_KEY, JSON.stringify(agents)), [agents]);
  useEffect(() => localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(sources)), [sources]);
  return {
    agents, sources,
    createAgent: (agent: Agent) => setAgents((current) => [agent, ...current]),
    updateAgent: (id: string, agent: Agent) => setAgents((current) => current.map((item) => item.id === id ? agent : item)),
    deleteAgent: (id: string) => setAgents((current) => current.filter((agent) => agent.id !== id)),
    addSource: (source: KnowledgeSource) => setSources((current) => [source, ...current]),
    updateSource: (id: string, patch: Partial<KnowledgeSource>) => setSources((current) => current.map((source) => source.id === id ? { ...source, ...patch } : source)),
  };
}
