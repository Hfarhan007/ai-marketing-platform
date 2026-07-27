import { ChevronLeft, Eye, Maximize2, Minimize2, Monitor, PanelLeft, PanelRight, Save, Smartphone, Tablet, Undo2, Redo2 } from 'lucide-react';
import { Button, StatusDot, Tooltip } from '@/shared/ui';

type Device = 'desktop' | 'tablet' | 'mobile';
type MobilePanel = 'canvas' | 'inspector' | 'library';

export interface BuilderToolbarProps {
  device: Device;
  dirty: boolean;
  fullscreen: boolean;
  mobilePanel: MobilePanel;
  onDeviceChange: (device: Device) => void;
  onFullscreen: () => void;
  onMobilePanelChange: (panel: MobilePanel) => void;
  onSave: () => void;
}

export function BuilderToolbar({ device, dirty, fullscreen, mobilePanel, onDeviceChange, onFullscreen, onMobilePanelChange, onSave }: BuilderToolbarProps) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950">
      <Button aria-label="Back" size="sm" variant="ghost"><ChevronLeft className="rtl:rotate-180" size={19} /></Button>
      <div className="min-w-0"><p className="truncate text-sm font-semibold">Untitled design</p><StatusDot className="text-xs text-slate-500" label={dirty ? 'Unsaved changes' : 'Saved'} status={dirty ? 'warning' : 'success'} /></div>
      <div className="ms-2 hidden items-center gap-1 sm:flex"><Tooltip content="Undo"><Button aria-label="Undo" size="sm" variant="ghost"><Undo2 size={17} /></Button></Tooltip><Tooltip content="Redo"><Button aria-label="Redo" size="sm" variant="ghost"><Redo2 size={17} /></Button></Tooltip></div>
      <div aria-label="Builder panels" className="ms-auto flex md:hidden" role="group">
        <Button aria-label="Open element library" aria-pressed={mobilePanel === 'library'} onClick={() => onMobilePanelChange('library')} size="sm" variant={mobilePanel === 'library' ? 'secondary' : 'ghost'}><PanelLeft size={17} /></Button>
        <Button aria-label="Open canvas" aria-pressed={mobilePanel === 'canvas'} onClick={() => onMobilePanelChange('canvas')} size="sm" variant={mobilePanel === 'canvas' ? 'secondary' : 'ghost'}><Monitor size={17} /></Button>
        <Button aria-label="Open inspector" aria-pressed={mobilePanel === 'inspector'} onClick={() => onMobilePanelChange('inspector')} size="sm" variant={mobilePanel === 'inspector' ? 'secondary' : 'ghost'}><PanelRight size={17} /></Button>
      </div>
      <div aria-label="Preview size" className="mx-auto hidden rounded-lg bg-slate-100 p-1 md:flex dark:bg-slate-900" role="group">
        {([{ id: 'desktop', icon: Monitor }, { id: 'tablet', icon: Tablet }, { id: 'mobile', icon: Smartphone }] as const).map(({ id, icon: Icon }) => <Button aria-label={`${id} preview`} aria-pressed={device === id} key={id} onClick={() => onDeviceChange(id)} size="sm" variant={device === id ? 'secondary' : 'ghost'}><Icon size={16} /></Button>)}
      </div>
      <div className="ms-auto hidden items-center gap-2 md:flex"><Button aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={onFullscreen} size="sm" variant="ghost">{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</Button><Button className="hidden lg:inline-flex" size="sm" variant="outline"><Eye size={16} />Preview</Button><Button onClick={onSave} size="sm"><Save size={16} /><span className="hidden lg:inline">Save</span></Button></div>
    </header>
  );
}
