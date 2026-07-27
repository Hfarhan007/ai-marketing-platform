import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useOnlineStatus } from './offline-status';

function StatusProbe() {
  return <span>{useOnlineStatus()}</span>;
}

describe('useOnlineStatus', () => {
  it('reacts to browser connectivity changes', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    render(<StatusProbe />);
    expect(screen.getByText('online')).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await act(async () => {
      await Promise.resolve();
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('offline')).toBeInTheDocument();
  });
});
