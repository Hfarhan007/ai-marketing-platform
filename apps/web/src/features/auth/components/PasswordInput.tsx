import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Input } from '@/shared/ui';

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string | undefined;
  label: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ error, label, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <Input
        error={error}
        label={label}
        ref={ref}
        trailing={
          <button aria-label={visible ? 'Hide password' : 'Show password'} className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => setVisible((value) => !value)} type="button">
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        }
        type={visible ? 'text' : 'password'}
        {...props}
      />
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
