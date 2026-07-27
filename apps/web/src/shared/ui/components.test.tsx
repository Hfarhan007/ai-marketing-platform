import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Button, CommandMenu, Dropzone, Dropdown, Input, Modal, MultiSelect,
  ResizablePanels, Switch, Tabs,
} from './index';

afterEach(cleanup);

describe('form controls', () => {
  it('forwards refs and exposes loading and validation semantics', () => {
    const buttonRef = createRef<HTMLButtonElement>();
    const inputRef = createRef<HTMLInputElement>();
    render(<><Button loading ref={buttonRef}>Save</Button><Input error="Email is required" label="Email" ref={inputRef} /></>);
    expect(buttonRef.current).toBeDisabled();
    expect(buttonRef.current).toHaveAttribute('aria-busy', 'true');
    expect(inputRef.current).toHaveAccessibleName('Email');
    expect(inputRef.current).toHaveAttribute('aria-invalid', 'true');
    expect(inputRef.current).toHaveAccessibleDescription('Email is required');
  });

  it('supports uncontrolled and controlled switches', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const { rerender } = render(<Switch defaultChecked={false} label="Notifications" onCheckedChange={change} />);
    const control = screen.getByRole('switch', { name: 'Notifications' });
    await user.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
    rerender(<Switch checked label="Notifications" onCheckedChange={change} />);
    await user.click(control);
    expect(change).toHaveBeenLastCalledWith(false);
  });

  it('supports accessible multi-selection', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<MultiSelect label="Channels" onChange={change} options={['Email', 'SMS']} value={['Email']} />);
    expect(screen.getByRole('checkbox', { name: 'Email' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'SMS' }));
    expect(change).toHaveBeenCalledWith(['Email', 'SMS']);
  });
});

describe('overlays and keyboard navigation', () => {
  it('locks scrolling, closes a modal with Escape, and restores focus', () => {
    const close = vi.fn();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const { rerender } = render(<Modal onClose={close} open title="Confirm"><Button>Continue</Button></Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    rerender(<Modal onClose={close} open={false} title="Confirm"><Button>Continue</Button></Modal>);
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    trigger.remove();
  });

  it('moves tabs and menu items with the keyboard', async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    render(<><Tabs items={[{ content: 'First panel', label: 'First', value: 'first' }, { content: 'Second panel', label: 'Second', value: 'second' }]} /><Dropdown items={[{ label: 'Edit', onSelect: select }, { label: 'Delete', onSelect: select }]} label="Actions" trigger={<Button>Actions</Button>} /></>);
    const first = screen.getByRole('tab', { name: 'First' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Second panel');
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    const edit = screen.getByRole('menuitem', { name: 'Edit' });
    edit.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  });

  it('filters and executes command menu options', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    render(<CommandMenu items={[{ id: 'contacts', label: 'Open contacts', onSelect: run }, { id: 'settings', label: 'Open settings', onSelect: vi.fn() }]} />);
    await user.type(screen.getByRole('combobox'), 'contacts');
    await user.keyboard('{Enter}');
    expect(run).toHaveBeenCalledOnce();
  });
});

describe('advanced controls', () => {
  it('validates dropped files before emitting them', () => {
    const files = vi.fn();
    render(<Dropzone allowedMimeTypes={['image/*']} maxBytes={200} onFiles={files} />);
    const valid = new File(['ok'], 'ok.png', { type: 'image/png' });
    const invalid = new File(['x'.repeat(300)], 'bad.txt', { type: 'text/plain' });
    fireEvent.drop(screen.getByText('Drop files here or browse').parentElement!, { dataTransfer: { files: [valid, invalid] } });
    expect(files).toHaveBeenCalledWith([valid]);
  });

  it('resizes panels through its native range control', () => {
    const resize = vi.fn();
    render(<ResizablePanels onResize={resize} primary={<div>Primary</div>} secondary={<div>Secondary</div>} />);
    const slider = screen.getByRole('slider', { name: 'Resize panels' });
    act(() => { slider.focus(); fireEvent.change(slider, { target: { value: '55' } }); });
    expect(slider).toHaveValue('55');
    expect(resize).toHaveBeenCalledWith(55);
  });
});
