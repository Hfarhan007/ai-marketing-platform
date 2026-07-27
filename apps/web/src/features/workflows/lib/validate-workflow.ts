import type { ValidationIssue, WorkflowDocument } from '../types/workflow.types';

export function validateWorkflow(workflow: Pick<WorkflowDocument, 'nodes' | 'edges'>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const triggers = workflow.nodes.filter((node) => node.data.category === 'trigger');
  if (!triggers.length) issues.push({ id: 'missing-trigger', severity: 'error', message: 'Add at least one trigger to start the workflow.' });
  if (triggers.length > 1) issues.push({ id: 'many-triggers', severity: 'warning', message: 'Multiple triggers can make enrollment harder to predict.' });
  workflow.nodes.forEach((node) => {
    const incoming = workflow.edges.some((edge) => edge.target === node.id);
    const outgoing = workflow.edges.some((edge) => edge.source === node.id);
    if (node.data.category !== 'trigger' && !incoming) issues.push({ id: `orphan-${node.id}`, severity: 'error', message: `${node.data.label} is not connected to an incoming path.`, nodeId: node.id });
    if (!outgoing && node.data.nodeType !== 'stop-workflow') issues.push({ id: `terminal-${node.id}`, severity: 'warning', message: `${node.data.label} ends without a Stop workflow node.`, nodeId: node.id });
  });
  return issues;
}
