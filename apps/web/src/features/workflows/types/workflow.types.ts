import type { Edge, Node } from '@xyflow/react';

export type NodeCategory = 'trigger' | 'action' | 'logic' | 'ai';

export interface WorkflowNodeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
}

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  category: NodeCategory;
  description: string;
  config: Record<string, string>;
}

export type WorkflowNode = Node<WorkflowNodeData>;

export interface WorkflowDocument {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published';
  updatedAt: string;
  nodes: WorkflowNode[];
  edges: Edge[];
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
}
