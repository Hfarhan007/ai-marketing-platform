import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { WorkspaceProvider } from '@/app/providers/WorkspaceProvider';
import { useAuthStore } from '@/features/auth';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from './CommandPalette';
import { MobileNavigation } from './MobileNavigation';

function LayoutHarness({ children }: { children: ReactNode }) {
  return <AuthProvider><MemoryRouter initialEntries={['/app/demo-workspace/dashboard']}><Routes><Route path="/app/:workspaceId/*" element={<WorkspaceProvider>{children}</WorkspaceProvider>} /></Routes></MemoryRouter></AuthProvider>;
}

describe('application layout navigation', () => {
  beforeEach(() => {
    useAuthStore.setState({ isLoading: false, user: { displayName: 'Owner', email: 'owner@example.com', id: 'owner', plan: 'enterprise', role: 'owner' } });
  });
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ user: null });
  });

  it('renders grouped navigation, active state, and collapses the sidebar', () => {
    const onCollapsedChange = vi.fn();
    render(<LayoutHarness><AppSidebar collapsed={false} onCollapsedChange={onCollapsedChange} /></LayoutHarness>);
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('opens mobile navigation, closes on Escape, and restores focus', () => {
    const onClose = vi.fn();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const { rerender } = render(<LayoutHarness><MobileNavigation onClose={onClose} open /></LayoutHarness>);
    expect(screen.getByRole('dialog', { name: 'Mobile navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<LayoutHarness><MobileNavigation onClose={onClose} open={false} /></LayoutHarness>);
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('toggles the command palette with the keyboard shortcut', () => {
    const onClose = vi.fn();
    const onOpen = vi.fn();
    const { rerender } = render(<LayoutHarness><CommandPalette onClose={onClose} onOpen={onOpen} open={false} /></LayoutHarness>);
    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    expect(onOpen).toHaveBeenCalledOnce();
    rerender(<LayoutHarness><CommandPalette onClose={onClose} onOpen={onOpen} open /></LayoutHarness>);
    expect(screen.getByRole('dialog', { name: 'Search and commands' })).toBeInTheDocument();
    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
