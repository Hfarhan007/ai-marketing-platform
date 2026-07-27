import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CommandMenu, Modal } from '@/shared/ui';

export interface CommandPaletteProps {
  onClose: () => void;
  onOpen: () => void;
  open: boolean;
}

export function CommandPalette({ onClose, onOpen, open }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { workspaceId = 'demo-workspace' } = useParams();
  const goTo = (path: string) => {
    onClose();
    void navigate(`/app/${workspaceId}${path}`);
  };
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) onClose(); else onOpen();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onOpen, open]);
  return (
    <Modal description="Navigate quickly using the keyboard." onClose={onClose} open={open} title="Search and commands">
      <CommandMenu items={[
        { id: 'dashboard', label: 'Go to dashboard', onSelect: () => goTo('/dashboard'), shortcut: 'G D' },
        { id: 'contacts', label: 'Search contacts', keywords: ['records', 'people'], onSelect: () => goTo('/contacts'), shortcut: 'G C' },
        { id: 'invite', label: 'Invite a teammate', onSelect: () => goTo('/team') },
        { id: 'settings', label: 'Open settings', onSelect: () => goTo('/settings') },
      ]} />
    </Modal>
  );
}
