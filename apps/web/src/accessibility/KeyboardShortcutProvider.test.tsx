import { fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from './keyboard-shortcut-context';
import { KeyboardShortcutProvider } from './KeyboardShortcutProvider';

function ShortcutRegistration({ handler }: { handler: () => void }) {
  const { register } = useKeyboardShortcuts();
  useEffect(() => register({ handler, key: 'k', meta: true }), [handler, register]);
  return <input aria-label="Editor" />;
}

describe('KeyboardShortcutProvider', () => {
  it('runs registered shortcuts while ignoring editable controls', () => {
    const handler = vi.fn();
    const { getByRole } = render(<KeyboardShortcutProvider><ShortcutRegistration handler={handler} /></KeyboardShortcutProvider>);
    fireEvent.keyDown(window, { ctrlKey: true, key: 'k' });
    expect(handler).toHaveBeenCalledOnce();
    const input = getByRole('textbox');
    input.focus();
    fireEvent.keyDown(input, { ctrlKey: true, key: 'k' });
    expect(handler).toHaveBeenCalledOnce();
  });
});
