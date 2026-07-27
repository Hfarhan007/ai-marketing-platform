import { type KeyboardEvent, type ReactNode, useId, useState } from 'react';
import { cn } from '@/shared/utils/cn';

export interface TabItem {
  content: ReactNode;
  disabled?: boolean;
  label: string;
  value: string;
}

export interface TabsProps {
  defaultValue?: string;
  disabled?: boolean;
  items: readonly TabItem[];
  onValueChange?: (value: string) => void;
  value?: string;
}

export function Tabs({ defaultValue, disabled, items, onValueChange, value }: TabsProps) {
  const id = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? items.find((item) => !item.disabled)?.value ?? '');
  const activeValue = value ?? internalValue;
  const select = (next: string) => { if (value === undefined) setInternalValue(next); onValueChange?.(next); };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const enabled = items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => !item.disabled);
    const current = enabled.findIndex(({ itemIndex }) => itemIndex === index);
    const next = enabled[(current + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
    if (next) select(next.item.value);
  };
  const active = items.find((item) => item.value === activeValue);
  return (
    <div className={cn('min-w-0', disabled && 'opacity-60')}>
      <div className="flex max-w-full gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700" role="tablist">
        {items.map((item, index) => <button aria-controls={`${id}-panel-${item.value}`} aria-selected={activeValue === item.value} className={cn('shrink-0 border-b-2 px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50', activeValue === item.value ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')} disabled={disabled || item.disabled} id={`${id}-tab-${item.value}`} key={item.value} onClick={() => select(item.value)} onKeyDown={(event) => onKeyDown(event, index)} role="tab" tabIndex={activeValue === item.value ? 0 : -1} type="button">{item.label}</button>)}
      </div>
      {active ? <div aria-labelledby={`${id}-tab-${active.value}`} className="py-4" id={`${id}-panel-${active.value}`} role="tabpanel" tabIndex={0}>{active.content}</div> : null}
    </div>
  );
}
