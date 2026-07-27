import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';
import { BuilderCanvas } from './BuilderCanvas';
import { BuilderInspector } from './BuilderInspector';
import { BuilderSidebar } from './BuilderSidebar';
import { BuilderToolbar } from './BuilderToolbar';

export interface BuilderLayoutProps {
  children?: ReactNode;
  initiallyDirty?: boolean;
}

type MobilePanel = 'canvas' | 'inspector' | 'library';

export function BuilderLayout({ children, initiallyDirty = false }: BuilderLayoutProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [dirty, setDirty] = useState(initiallyDirty);
  const [fullscreen, setFullscreen] = useState(false);
  const [libraryWidth, setLibraryWidth] = useState(224);
  const [inspectorWidth, setInspectorWidth] = useState(288);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('canvas');

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const resize = useCallback((side: 'library' | 'inspector', delta: number) => {
    if (side === 'library') setLibraryWidth((width) => Math.min(360, Math.max(176, width + delta)));
    else setInspectorWidth((width) => Math.min(420, Math.max(240, width - delta)));
  }, []);
  const startResize = (side: 'library' | 'inspector', event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    let lastX = event.clientX;
    const move = (pointerEvent: PointerEvent) => {
      resize(side, pointerEvent.clientX - lastX);
      lastX = pointerEvent.clientX;
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop);
  };
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.current?.requestFullscreen();
  };

  return (
    <div className="h-dvh overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white" ref={rootRef}>
      <BuilderToolbar device={device} dirty={dirty} fullscreen={fullscreen} mobilePanel={mobilePanel} onDeviceChange={setDevice} onFullscreen={() => { void toggleFullscreen(); }} onMobilePanelChange={setMobilePanel} onSave={() => setDirty(false)} />
      <div className="hidden h-[calc(100dvh-3.5rem)] min-h-0 md:grid" style={{ gridTemplateColumns: `${libraryWidth}px 5px minmax(0,1fr) 5px ${inspectorWidth}px` }}>
        <BuilderSidebar onInsert={() => setDirty(true)} />
        <button aria-label="Resize element library" className="cursor-col-resize bg-slate-200 hover:bg-indigo-400 focus-visible:bg-indigo-500 focus-visible:outline-none dark:bg-slate-800" onKeyDown={(event) => { if (event.key === 'ArrowLeft') resize('library', -16); if (event.key === 'ArrowRight') resize('library', 16); }} onPointerDown={(event) => startResize('library', event)} type="button" />
        <BuilderCanvas device={device}>{children ?? <Outlet />}</BuilderCanvas>
        <button aria-label="Resize inspector" className="cursor-col-resize bg-slate-200 hover:bg-indigo-400 focus-visible:bg-indigo-500 focus-visible:outline-none dark:bg-slate-800" onKeyDown={(event) => { if (event.key === 'ArrowLeft') resize('inspector', -16); if (event.key === 'ArrowRight') resize('inspector', 16); }} onPointerDown={(event) => startResize('inspector', event)} type="button" />
        <BuilderInspector />
      </div>
      <div className="h-[calc(100dvh-3.5rem)] md:hidden">
        <div className={cn('h-full', mobilePanel !== 'library' && 'hidden')}><BuilderSidebar mobile onInsert={() => { setDirty(true); setMobilePanel('canvas'); }} /></div>
        <div className={cn('h-full', mobilePanel !== 'canvas' && 'hidden')}><BuilderCanvas device={device}>{children ?? <Outlet />}</BuilderCanvas></div>
        <div className={cn('h-full', mobilePanel !== 'inspector' && 'hidden')}><BuilderInspector mobile /></div>
      </div>
    </div>
  );
}
