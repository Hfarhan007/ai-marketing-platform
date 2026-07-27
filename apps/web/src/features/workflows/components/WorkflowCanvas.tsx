import { addEdge, Background, type Connection, type Edge, type EdgeChange, MiniMap, type NodeChange, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useState, type DragEvent } from 'react';
import { nodeCatalog } from '../constants/node-catalog';
import type { WorkflowNode } from '../types/workflow.types';
import { MinimapControls } from './MinimapControls';
import { workflowNodeTypes } from './workflow-node-types';

export function WorkflowCanvas(props: {
  edges: Edge[]; nodes: WorkflowNode[]; onEdges: (changes: EdgeChange[]) => void; onNodes: (changes: NodeChange<WorkflowNode>[]) => void;
  onChangeEdges: (edges: Edge[]) => void; onAddNode: (node: WorkflowNode) => void; onSelect: (id?: string) => void; onSnapshot: () => void;
}) {
  return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>;
}

function CanvasInner({ edges, nodes, onAddNode, onChangeEdges, onEdges, onNodes, onSelect, onSnapshot }: {
  edges: Edge[]; nodes: WorkflowNode[]; onEdges: (changes: EdgeChange[]) => void; onNodes: (changes: NodeChange<WorkflowNode>[]) => void;
  onChangeEdges: (edges: Edge[]) => void; onAddNode: (node: WorkflowNode) => void; onSelect: (id?: string) => void; onSnapshot: () => void;
}) {
  const flow = useReactFlow<WorkflowNode>();
  const [minimap, setMinimap] = useState(true);
  const connect = useCallback((connection: Connection) => { onSnapshot(); onChangeEdges(addEdge({ ...connection, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, edges)); }, [edges, onChangeEdges, onSnapshot]);
  const drop = (event: DragEvent) => {
    event.preventDefault(); const type = event.dataTransfer.getData('application/workflow-node'); const definition = nodeCatalog.find((item) => item.type === type); if (!definition) return;
    onSnapshot(); const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onAddNode({ id: crypto.randomUUID(), type: 'workflow', position, data: { label: definition.label, nodeType: definition.type, category: definition.category, description: definition.description, config: {} } });
  };
  return <div className="relative h-full min-h-[34rem] bg-slate-50 dark:bg-slate-950"><ReactFlow<WorkflowNode> deleteKeyCode={null} edges={edges} fitView nodeTypes={workflowNodeTypes} nodes={nodes} onConnect={connect} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={drop} onEdgesChange={onEdges} onNodeClick={(_, node) => onSelect(node.id)} onNodeDragStart={onSnapshot} onNodesChange={onNodes} onPaneClick={() => onSelect()}><Background color="#94a3b8" gap={24} size={1} />{minimap ? <MiniMap pannable zoomable nodeColor={(node) => node.data.category === 'trigger' ? '#10b981' : node.data.category === 'action' ? '#6366f1' : node.data.category === 'logic' ? '#f59e0b' : '#8b5cf6'} /> : null}<MinimapControls minimap={minimap} onToggleMinimap={() => setMinimap((value) => !value)} /></ReactFlow></div>;
}
