import { Focus, Map, ZoomIn, ZoomOut } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { Button, Tooltip } from '@/shared/ui';

export function MinimapControls({ minimap, onToggleMinimap }: { minimap: boolean; onToggleMinimap: () => void }) {
  const flow = useReactFlow();
  return <div className="absolute bottom-4 left-4 z-10 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"><Tooltip content="Zoom in"><Button aria-label="Zoom in" onClick={() => void flow.zoomIn()} size="sm" variant="ghost"><ZoomIn size={16} /></Button></Tooltip><Tooltip content="Zoom out"><Button aria-label="Zoom out" onClick={() => void flow.zoomOut()} size="sm" variant="ghost"><ZoomOut size={16} /></Button></Tooltip><Tooltip content="Fit workflow"><Button aria-label="Fit workflow" onClick={() => void flow.fitView({ padding: 0.2 })} size="sm" variant="ghost"><Focus size={16} /></Button></Tooltip><Tooltip content="Toggle minimap"><Button aria-label="Toggle minimap" aria-pressed={minimap} onClick={onToggleMinimap} size="sm" variant={minimap ? 'secondary' : 'ghost'}><Map size={16} /></Button></Tooltip></div>;
}
