import { Menu, Moon, Sun } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button, Dropdown } from '@/shared/ui';
import { useAuth, useTheme } from '@/app/providers';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { LanguageSelector } from '../../i18n';

export interface AppHeaderProps {
  onCommandOpen: () => void;
  onMobileMenuOpen: () => void;
}

export function AppHeader({ onCommandOpen, onMobileMenuOpen }: AppHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { signOut, user } = useAuth();
  const { workspaceId = 'demo-workspace' } = useParams();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6 dark:border-slate-800 dark:bg-slate-950/90">
      <Button aria-label="Open navigation" className="lg:hidden" onClick={onMobileMenuOpen} size="sm" variant="ghost"><Menu size={20} /></Button>
      <div className="min-w-0 flex-1"><GlobalSearch onOpen={onCommandOpen} /></div>
      <Button aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} size="sm" variant="ghost">{resolvedTheme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</Button>
      <LanguageSelector />
      <NotificationCenter />
      <Dropdown
        items={[
          { label: 'Profile', onSelect: () => { void navigate(`/app/${workspaceId}/settings`); } },
          { label: 'Workspace settings', onSelect: () => { void navigate(`/app/${workspaceId}/settings`); } },
          { danger: true, label: 'Sign out', onSelect: () => { signOut(); void navigate('/login', { replace: true }); } },
        ]}
        label="User menu"
        trigger={<span className="flex items-center gap-2 rounded-lg p-1 pe-2 hover:bg-slate-100 dark:hover:bg-slate-900"><Avatar alt={user?.displayName ?? 'User'} size="sm" /><span className="hidden text-start md:block"><span className="block text-sm font-medium">{user?.displayName ?? 'User'}</span><span className="block text-xs text-slate-500">{user?.email ?? ''}</span></span></span>}
      />
    </header>
  );
}
