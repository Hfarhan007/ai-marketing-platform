import { applyEdgeChanges, applyNodeChanges, type Edge, type EdgeChange, type NodeChange } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/app/providers';
import { Button, Input, Modal, Textarea } from '@/shared/ui';
import { NodeInspector } from '../components/NodeInspector';
import { NodeLibrary } from '../components/NodeLibrary';
import { ValidationPanel } from '../components/ValidationPanel';
import { WorkflowCanvas } from '../components/WorkflowCanvas';
import { WorkflowToolbar } from '../components/WorkflowToolbar';
import { loadWorkflow, saveWorkflow } from '../lib/workflow-storage';
import { validateWorkflow } from '../lib/validate-workflow';
import type { WorkflowDocument, WorkflowNode } from '../types/workflow.types';

interface Snapshot { nodes: WorkflowNode[]; edges: Edge[] }
const newWorkflow = (id: string): WorkflowDocument => ({ id, name: 'Untitled workflow', description: 'A new customer journey.', status: 'draft', updatedAt: '2026-07-23T12:00:00.000Z', nodes: [], edges: [] });

export function WorkflowBuilderPage() {
  const { workspaceId = 'demo-workspace', workflowId } = useParams();
  const navigate = useNavigate(); const { notify } = useToast();
  const initial = loadWorkflow(workflowId ?? '') ?? newWorkflow(workflowId === undefined || workflowId === 'new' ? 'workflow-draft' : workflowId);
  const name = initial.name; const description = initial.description; const [status, setStatus] = useState(initial.status);
  const [nodes, setNodes] = useState<WorkflowNode[]>(initial.nodes); const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const [selectedId, setSelectedId] = useState<string>(); const [past, setPast] = useState<Snapshot[]>([]); const [future, setFuture] = useState<Snapshot[]>([]);
  const [dirty, setDirty] = useState(false); const [jsonOpen, setJsonOpen] = useState(false); const [testOpen, setTestOpen] = useState(false);
  const selected = nodes.find(({ id }) => id === selectedId); const issues = validateWorkflow({ nodes, edges });
  const document = (): WorkflowDocument => ({ id: initial.id, name, description, status, updatedAt: new Date().toISOString(), nodes, edges });
  const snapshot = () => { setPast((current) => [...current.slice(-39), { nodes: structuredClone(nodes), edges: structuredClone(edges) }]); setFuture([]); setDirty(true); };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (!dirty) return; event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const back = () => { if (dirty && !window.confirm('Discard unsaved workflow changes?')) return; void navigate(`/app/${workspaceId}/workflows`); };
  const save = () => { saveWorkflow(document()); setDirty(false); notify({ title: 'Draft saved locally', tone: 'success' }); };
  const publish = () => {
    if (issues.some(({ severity }) => severity === 'error')) { notify({ title: 'Fix validation errors before publishing', tone: 'error' }); return; }
    const next = { ...document(), status: 'published' as const }; saveWorkflow(next); setStatus('published'); setDirty(false); notify({ title: 'Workflow published', description: 'Publishing is simulated; no automation engine was started.', tone: 'success' });
  };
  const undo = () => { const previous = past.at(-1); if (!previous) return; setFuture((current) => [{ nodes: structuredClone(nodes), edges: structuredClone(edges) }, ...current]); setPast((current) => current.slice(0, -1)); setNodes(previous.nodes); setEdges(previous.edges); setDirty(true); };
  const redo = () => { const next = future[0]; if (!next) return; setPast((current) => [...current, { nodes: structuredClone(nodes), edges: structuredClone(edges) }]); setFuture((current) => current.slice(1)); setNodes(next.nodes); setEdges(next.edges); setDirty(true); };
  const removeSelected = () => { if (!selectedId) return; snapshot(); setNodes((current) => current.filter(({ id }) => id !== selectedId)); setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId)); setSelectedId(undefined); };
  const duplicateSelected = () => { if (!selected) return; snapshot(); const copy = { ...structuredClone(selected), id: crypto.randomUUID(), position: { x: selected.position.x + 40, y: selected.position.y + 40 }, selected: false }; setNodes((current) => [...current, copy]); setSelectedId(copy.id); };
  return <div className="-m-4 sm:-m-6 lg:-m-8"><div className="grid h-[calc(100vh-8.5rem)] min-h-[42rem] grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-y border-slate-200 dark:border-slate-800"><WorkflowToolbar canRedo={future.length > 0} canUndo={past.length > 0} dirty={dirty} name={name} onBack={back} onJson={() => setJsonOpen(true)} onPublish={publish} onRedo={redo} onSave={save} onTest={() => setTestOpen(true)} onUndo={undo} published={status === 'published'} /><div className="grid min-h-0 md:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_19rem]"><div className="hidden min-h-0 md:block"><NodeLibrary /></div><div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]"><WorkflowCanvas edges={edges} nodes={nodes} onAddNode={(node) => { setNodes((current) => [...current, node]); setSelectedId(node.id); setDirty(true); }} onChangeEdges={(next) => { setEdges(next); setDirty(true); }} onEdges={(changes: EdgeChange[]) => { setEdges((current) => applyEdgeChanges(changes, current)); if (changes.some(({ type }) => type === 'remove')) setDirty(true); }} onNodes={(changes: NodeChange<WorkflowNode>[]) => { setNodes((current) => applyNodeChanges(changes, current)); if (changes.some(({ type }) => type !== 'select' && type !== 'dimensions')) setDirty(true); }} onSelect={setSelectedId} onSnapshot={snapshot} /><ValidationPanel issues={issues} onSelect={setSelectedId} /></div><div className="hidden min-h-0 xl:block"><NodeInspector {...(selected ? { node: selected } : {})} onDelete={removeSelected} onDuplicate={duplicateSelected} onUpdate={(data) => { snapshot(); setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, data } : node)); }} /></div></div></div>
    <Modal onClose={() => setJsonOpen(false)} open={jsonOpen} title="Workflow JSON preview"><pre className="max-h-[60vh] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(document(), null, 2)}</pre></Modal>
    <Modal onClose={() => setTestOpen(false)} open={testOpen} title="Test workflow" description="Simulate enrollment without executing actions."><div className="grid gap-4"><Input label="Test contact" value="Olivia Martin" readOnly /><Textarea label="Simulation result" readOnly rows={5} value={issues.some(({ severity }) => severity === 'error') ? `Test blocked: ${issues.filter(({ severity }) => severity === 'error').length} validation errors must be fixed.` : `Simulation ready. ${nodes.length} nodes and ${edges.length} connections would be evaluated. No messages or actions will run.`} /><Button onClick={() => notify({ title: 'Test completed', description: 'The mock workflow path was validated without running actions.', tone: 'success' })}>Run simulation</Button></div></Modal>
  </div>;
}

export default WorkflowBuilderPage;
