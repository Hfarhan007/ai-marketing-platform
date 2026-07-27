import { cloneElement, type MouseEventHandler, type ReactElement, useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onSelect: () => void;
}

export interface DropdownProps {
  disabled?: boolean;
  items: readonly DropdownItem[];
  label: string;
  trigger: ReactElement<{
    'aria-expanded'?: boolean;
    'aria-haspopup'?: 'menu';
    disabled?: boolean;
    onClick?: MouseEventHandler<HTMLElement>;
  }>;
}

export function Dropdown({ disabled, items, label, trigger }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') setOpen(false);
      if (event instanceof MouseEvent && !rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const moveFocus = (index: number, direction: number) => {
    const enabled = items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => !item.disabled);
    const current = enabled.findIndex(({ itemIndex }) => itemIndex === index);
    const next = enabled[(current + direction + enabled.length) % enabled.length];
    if (next) itemRefs.current[next.itemIndex]?.focus();
  };
  const triggerDisabled = disabled || trigger.props.disabled;
  const triggerElement = cloneElement(trigger, {
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    ...(triggerDisabled === undefined ? {} : { disabled: triggerDisabled }),
    onClick: (event) => {
      trigger.props.onClick?.(event);
      if (!event.defaultPrevented) setOpen((value) => !value);
    },
  });
  return (
    <div className="relative inline-flex" ref={rootRef}>
      {triggerElement}
      {open ? <div aria-label={label} className="absolute right-0 top-full z-40 mt-2 min-w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="menu">
        {items.map((item, index) => <button className={`flex w-full rounded-md px-3 py-2 text-left text-sm focus:bg-slate-100 focus:outline-none disabled:opacity-50 dark:focus:bg-slate-800 ${item.danger ? 'text-red-600 dark:text-red-400' : ''}`} disabled={item.disabled} key={item.label} onClick={() => { item.onSelect(); setOpen(false); }} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(index, 1); } if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(index, -1); } }} ref={(node) => { itemRefs.current[index] = node; }} role="menuitem" type="button">{item.label}</button>)}
      </div> : null}
    </div>
  );
}
