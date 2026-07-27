import { Button, Input } from '@/shared/ui';
import { MediaGrid } from '../components/MediaGrid';
import type { MediaAsset } from '../types/media.types';
const assets: MediaAsset[] = [{ folder: 'Brand', id: 'm1', kind: 'image', name: 'campaign-hero.webp', size: '840 KB', usageCount: 3 }, { folder: 'Video', id: 'm2', kind: 'video', name: 'product-tour.mp4', size: '18 MB', usageCount: 1 }, { folder: 'Documents', id: 'm3', kind: 'document', name: 'brand-guide.pdf', size: '2.4 MB', usageCount: 5 }];
export function MediaLibraryPage() { return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Media library</h1><p className="text-slate-500">Organize mock assets without external storage.</p></div><Button>Upload files</Button></header><Input aria-label="Search media" placeholder="Search files and folders" /><MediaGrid assets={assets} /></div>; }
export default MediaLibraryPage;
