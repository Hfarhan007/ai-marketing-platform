import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button';
import { Calendar } from './Calendar';
import { Popover } from './Popover';

export interface DatePickerProps {
  disabled?: boolean;
  label?: string;
  onChange?: (date: Date) => void;
  placeholder?: string;
  value?: Date;
}

export function DatePicker({ disabled = false, label = 'Choose date', onChange, placeholder = 'Select a date', value }: DatePickerProps) {
  const [selected, setSelected] = useState(value);
  const choose = (date: Date) => { setSelected(date); onChange?.(date); };
  return <Popover content={<Calendar disabled={disabled} onChange={choose} {...(selected ? { value: selected } : {})} />} disabled={disabled} label={label}><Button disabled={disabled} variant="outline"><CalendarDays size={16} />{selected ? selected.toLocaleDateString() : placeholder}</Button></Popover>;
}
