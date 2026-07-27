import {
  Check, Clipboard, HelpCircle, Upload, X,
} from 'lucide-react';
import {
  forwardRef, type HTMLAttributes, type InputHTMLAttributes, type KeyboardEvent,
  type ReactNode, type TextareaHTMLAttributes, useId, useRef,
  useState, useSyncExternalStore,
} from 'react';
import type * as React from 'react';
import { useClipboard } from '@/shared/hooks';
import { validateFile } from '@/shared/utils';
import type { FileValidationOptions } from '@/shared/types';
import { cn } from '@/shared/utils/cn';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { Input, type InputProps } from './Input';
import { Modal } from './Modal';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
}
export const Alert = forwardRef<HTMLDivElement, AlertProps>(({ children, className, title, variant = 'info', ...props }, ref) => (
  <div className={cn('rounded-xl border p-4 text-sm', {
    'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100': variant === 'info',
    'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100': variant === 'success',
    'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100': variant === 'warning',
    'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100': variant === 'danger',
  }, className)} ref={ref} role={variant === 'danger' ? 'alert' : 'status'} {...props}><p className="font-semibold">{title}</p><div className="mt-1 opacity-80">{children}</div></div>
));
Alert.displayName = 'Alert';

export interface AlertDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}
export function AlertDialog({ cancelLabel = 'Cancel', confirmLabel = 'Confirm', description, loading, onClose, onConfirm, open, title }: AlertDialogProps) {
  return <Modal description={description} onClose={onClose} open={open} title={title} {...(loading === undefined ? {} : { loading })}><div className="flex flex-wrap justify-end gap-2"><Button disabled={loading} onClick={onClose} variant="outline">{cancelLabel}</Button><Button onClick={onConfirm} variant="danger" {...(loading === undefined ? {} : { loading })}>{confirmLabel}</Button></div></Modal>;
}

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> { indeterminate?: boolean; label?: string; showValue?: boolean; value?: number }
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(({ className, indeterminate, label = 'Progress', showValue = true, value = 0, ...props }, ref) => {
  const safe = Math.min(100, Math.max(0, value));
  return <div className={cn('min-w-0', className)} ref={ref} {...props}>{showValue ? <div className="mb-1 flex justify-between gap-3 text-xs"><span>{label}</span><span>{indeterminate ? 'In progress' : `${safe}%`}</span></div> : null}<div aria-label={label} aria-valuemax={100} aria-valuemin={0} {...(indeterminate ? {} : { 'aria-valuenow': safe })} className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar"><div className={cn('h-full rounded-full bg-indigo-600 transition-[width]', indeterminate && 'w-1/3 animate-[pulse_1.2s_ease-in-out_infinite]')} style={indeterminate ? undefined : { width: `${safe}%` }} /></div></div>;
});
Progress.displayName = 'Progress';

export const Spinner = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement> & { label?: string; size?: 'sm' | 'md' | 'lg' }>(({ className, label = 'Loading', size = 'md', ...props }, ref) => <span className={cn('inline-flex items-center', className)} ref={ref} role="status" {...props}><span aria-hidden="true" className={cn('animate-spin rounded-full border-2 border-current border-e-transparent', size === 'sm' && 'size-3', size === 'md' && 'size-5', size === 'lg' && 'size-8')} /><span className="sr-only">{label}</span></span>);
Spinner.displayName = 'Spinner';

export const Separator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }>(({ className, orientation = 'horizontal', ...props }, ref) => <div aria-orientation={orientation} className={cn(orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', 'shrink-0 bg-slate-200 dark:bg-slate-800', className)} ref={ref} role="separator" {...props} />);
Separator.displayName = 'Separator';

export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { label?: string }>(({ children, className, label = 'Scrollable content', tabIndex = 0, ...props }, ref) => <div aria-label={label} className={cn('overflow-auto overscroll-contain [scrollbar-gutter:stable]', className)} ref={ref} role="region" tabIndex={tabIndex} {...props}>{children}</div>);
ScrollArea.displayName = 'ScrollArea';
export { Drawer as Sheet };

export interface ComboboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  onChange?: (value: string) => void;
  options: readonly string[];
}
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(({ label, onChange, options, ...props }, ref) => {
  const id = useId();
  return <><Input aria-controls={id} aria-label={label} autoComplete="off" list={id} onChange={(event) => onChange?.(event.target.value)} ref={ref} {...props} /><datalist id={id}>{options.map((option) => <option key={option} value={option} />)}</datalist></>;
});
Combobox.displayName = 'Combobox';
export const SearchableSelect = Combobox;

export interface MultiSelectProps { disabled?: boolean; error?: string; label: string; onChange: (value: string[]) => void; options: readonly string[]; value: readonly string[] }
export function MultiSelect({ disabled, error, label, onChange, options, value }: MultiSelectProps) {
  return <fieldset aria-invalid={Boolean(error)} disabled={disabled}><legend className="mb-2 text-sm font-medium">{label}</legend><div className="flex flex-wrap gap-2">{options.map((option) => { const selected = value.includes(option); return <label className={cn('cursor-pointer rounded-full border px-3 py-1 text-sm transition focus-within:ring-2 focus-within:ring-indigo-500', selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'border-slate-300 dark:border-slate-700')} key={option}><input checked={selected} className="sr-only" onChange={() => onChange(selected ? value.filter((item) => item !== option) : [...value, option])} type="checkbox" />{option}</label>; })}</div>{error ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p> : null}</fieldset>;
}

interface FileControlProps extends FileValidationOptions { accept?: string; disabled?: boolean; label?: string; multiple?: boolean; onError?: (errors: readonly string[]) => void; onFiles: (files: File[]) => void }
function acceptedFiles(files: readonly File[], options: FileValidationOptions & { onError?: (errors: readonly string[]) => void }) {
  const results = files.map((file) => ({ file, result: validateFile(file, options) }));
  const errors = results.flatMap(({ file, result }) => result.errors.map((error) => `${file.name}: ${error}`));
  options.onError?.(errors);
  return results.filter(({ result }) => result.valid).map(({ file }) => file);
}
export const FileUpload = forwardRef<HTMLInputElement, FileControlProps>(({ accept, disabled, label = 'Choose files', multiple = true, onFiles, ...options }, ref) => <label className={cn('inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-indigo-500 dark:border-slate-700', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900')}><Upload size={16} />{label}<input accept={accept} className="sr-only" disabled={disabled} multiple={multiple} onChange={(event) => onFiles(acceptedFiles([...(event.target.files ?? [])], options))} ref={ref} type="file" /></label>);
FileUpload.displayName = 'FileUpload';

export function Dropzone({ accept, disabled, label = 'Drop files here or browse', multiple = true, onFiles, ...options }: FileControlProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const handle = (files: readonly File[]) => onFiles(acceptedFiles(files, options));
  return <div className={cn('relative grid min-h-36 w-full place-items-center rounded-xl border-2 border-dashed p-6 text-center text-sm text-slate-500 transition focus-within:ring-2 focus-within:ring-indigo-500', dragging && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30', disabled && 'pointer-events-none opacity-50')} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setDragging(false); handle([...event.dataTransfer.files]); }}><button disabled={disabled} onClick={() => ref.current?.click()} type="button"><Upload className="mx-auto mb-2" />{label}</button><input accept={accept} className="sr-only" disabled={disabled} multiple={multiple} onChange={(event) => handle([...(event.target.files ?? [])])} ref={ref} type="file" /></div>;
}

export const PhoneInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => <Input autoComplete="tel" inputMode="tel" ref={ref} type="tel" {...props} />);
PhoneInput.displayName = 'PhoneInput';
export const CurrencyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { currency?: string }>(({ className, currency = 'USD', ...props }, ref) => <div className={cn('flex items-center rounded-lg border border-slate-300 bg-white ps-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900', className)}><span aria-hidden="true" className="text-sm text-slate-500">{currency}</span><Input aria-label={`Amount in ${currency}`} className="border-0 focus:ring-0" inputMode="decimal" ref={ref} {...props} /></div>);
CurrencyInput.displayName = 'CurrencyInput';
export const ColorPicker = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => <input aria-label="Choose color" className={cn('h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900', className)} ref={ref} type="color" {...props} />);
ColorPicker.displayName = 'ColorPicker';

export function IconPicker({ disabled, icons, label = 'Choose icon', onChange, value }: { disabled?: boolean; icons: readonly string[]; label?: string; onChange: (icon: string) => void; value?: string }) {
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    onChange(icons[(index + (event.key === 'ArrowRight' ? 1 : -1) + icons.length) % icons.length] ?? '');
  };
  return <div aria-label={label} className="flex flex-wrap gap-2" role="radiogroup">{icons.map((icon, index) => <button aria-checked={value === icon} className={cn('rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700', value === icon && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950')} disabled={disabled} key={icon} onClick={() => onChange(icon)} onKeyDown={(event) => handleKey(event, index)} role="radio" tabIndex={value === icon || (!value && index === 0) ? 0 : -1} type="button">{icon}</button>)}</div>;
}

export interface EditorProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> { error?: string; label?: string; onChange?: (value: string) => void }
const Editor = forwardRef<HTMLTextAreaElement, EditorProps>(({ className, error, label = 'Code editor', onChange, ...props }, ref) => <label className="block"><span className="mb-1 block text-sm font-medium">{label}</span><textarea aria-invalid={Boolean(error)} className={cn('min-h-48 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50', error && 'border-red-500', className)} onChange={(event) => onChange?.(event.target.value)} ref={ref} spellCheck={false} {...props} />{error ? <span className="mt-1 block text-sm text-red-500">{error}</span> : null}</label>);
Editor.displayName = 'Editor';
export const CodeEditor = forwardRef<HTMLTextAreaElement, EditorProps>((props, ref) => <Editor label="Code editor" ref={ref} {...props} />);
export const JsonEditor = forwardRef<HTMLTextAreaElement, EditorProps>((props, ref) => <Editor label="JSON editor" ref={ref} {...props} />);
export const MarkdownEditor = forwardRef<HTMLTextAreaElement, EditorProps>((props, ref) => <Editor label="Markdown editor" ref={ref} {...props} />);
CodeEditor.displayName = 'CodeEditor'; JsonEditor.displayName = 'JsonEditor'; MarkdownEditor.displayName = 'MarkdownEditor';

export function ResizablePanels({ defaultPrimarySize = 50, disabled, onResize, primary, secondary }: { defaultPrimarySize?: number; disabled?: boolean; onResize?: (percent: number) => void; primary: ReactNode; secondary: ReactNode }) {
  const [size, setSize] = useState(Math.min(80, Math.max(20, defaultPrimarySize)));
  const update = (next: number) => { const safe = Math.min(80, Math.max(20, next)); setSize(safe); onResize?.(safe); };
  return <div className="grid min-h-0 grid-cols-1 md:grid-cols-[var(--primary)_0.375rem_minmax(0,1fr)]" style={{ '--primary': `${size}%` } as React.CSSProperties}><div className="min-w-0 overflow-auto">{primary}</div><input aria-label="Resize panels" className="hidden h-full w-1.5 cursor-col-resize appearance-none bg-slate-200 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:block dark:bg-slate-800" disabled={disabled} max={80} min={20} onChange={(event) => update(event.target.valueAsNumber)} step={5} type="range" value={size} /><div className="min-w-0 overflow-auto">{secondary}</div></div>;
}

export function VirtualizedList<Item>({ empty, estimateSize = 48, height = 384, items, overscan = 3, renderItem }: { empty?: ReactNode; estimateSize?: number; height?: number; items: readonly Item[]; overscan?: number; renderItem: (item: Item, index: number) => ReactNode }) {
  const [scrollTop, setScrollTop] = useState(0);
  const start = Math.max(0, Math.floor(scrollTop / estimateSize) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + height) / estimateSize) + overscan);
  if (!items.length) return <>{empty}</>;
  return <div aria-label="Virtualized list" className="overflow-auto" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)} role="list" style={{ height }}><div className="relative" style={{ height: items.length * estimateSize }}>{items.slice(start, end).map((item, offset) => <div key={start + offset} role="listitem" style={{ height: estimateSize, insetBlockStart: (start + offset) * estimateSize, position: 'absolute', width: '100%' }}>{renderItem(item, start + offset)}</div>)}</div></div>;
}
export function InfiniteScroll({ children, hasMore, label = 'Load more', loading = false, onLoadMore }: { children: ReactNode; hasMore: boolean; label?: string; loading?: boolean; onLoadMore: () => void }) { return <div>{children}{hasMore ? <Button className="mt-4 w-full" loading={loading} onClick={onLoadMore} variant="outline">{label}</Button> : <p className="sr-only">All items loaded</p>}</div>; }

export function CopyButton({ text }: { text: string }) {
  const { copied, copy, error } = useClipboard();
  return <Button aria-label={copied ? 'Copied' : 'Copy to clipboard'} onClick={() => { void copy(text); }} size="sm" title={error?.message} variant="ghost">{copied ? <Check size={16} /> : <Clipboard size={16} />}</Button>;
}
export function ShareDialog({ onClose, open, title = 'Share', url }: { onClose: () => void; open: boolean; title?: string; url: string }) { return <Modal onClose={onClose} open={open} title={title}><div className="flex gap-2"><Input aria-label="Share URL" readOnly value={url} /><CopyButton text={url} /></div></Modal>; }
export function HelpTooltip({ children }: { children: ReactNode }) { return <span className="inline-flex items-center gap-1 text-sm text-slate-500"><HelpCircle aria-hidden size={14} />{children}</span>; }
export function KeyboardKey({ children }: { children: ReactNode }) { return <kbd className="rounded border border-b-2 border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900">{children}</kbd>; }

function subscribeNetwork(listener: () => void) { window.addEventListener('online', listener); window.addEventListener('offline', listener); return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener); }; }
export function NetworkStatus({ offlineLabel = 'Offline', onlineLabel = 'Online' }: { offlineLabel?: string; onlineLabel?: string }) {
  const online = useSyncExternalStore(subscribeNetwork, () => navigator.onLine, () => true);
  return <span className="inline-flex items-center gap-2 text-sm" role="status"><span aria-hidden="true" className={cn('size-2 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />{online ? onlineLabel : offlineLabel}</span>;
}
export interface ToastProps extends HTMLAttributes<HTMLDivElement> { children: ReactNode; dismissLabel?: string; onDismiss?: () => void; variant?: 'default' | 'success' | 'warning' | 'danger' }
export const Toast = forwardRef<HTMLDivElement, ToastProps>(({ children, className, dismissLabel = 'Dismiss notification', onDismiss, variant = 'default', ...props }, ref) => <div aria-live={variant === 'danger' ? 'assertive' : 'polite'} className={cn('flex items-start gap-3 rounded-xl border bg-white p-4 text-sm shadow-lg dark:bg-slate-900', variant === 'success' && 'border-emerald-300 dark:border-emerald-800', variant === 'warning' && 'border-amber-300 dark:border-amber-800', variant === 'danger' && 'border-red-300 dark:border-red-800', className)} ref={ref} role={variant === 'danger' ? 'alert' : 'status'} {...props}><div className="min-w-0 flex-1">{children}</div>{onDismiss ? <button aria-label={dismissLabel} className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={onDismiss} type="button"><X size={16} /></button> : null}</div>);
Toast.displayName = 'Toast';
