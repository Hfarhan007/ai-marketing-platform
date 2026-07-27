import { Menu, Moon, Sparkles, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/app/providers';
import { Button } from '@/shared/ui';
import { LanguageSelector } from '../../i18n';

const links = [{ href: '#features', label: 'Features' }, { href: '#solutions', label: 'Solutions' }, { href: '#pricing', label: 'Pricing' }, { href: '/design-system', label: 'Design system' }] as const;

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <a className="flex items-center gap-2 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" href="/"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles size={17} /></span>MarketFlow</a>
        <nav aria-label="Public navigation" className="hidden flex-1 items-center gap-6 md:flex">{links.map((link) => <a className="rounded text-sm font-medium text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:text-white" href={link.href} key={link.href}>{link.label}</a>)}</nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          <Button aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} size="sm" variant="ghost">{resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</Button>
          <Button className="hidden sm:inline-flex" onClick={() => { void navigate('/login'); }} variant="ghost">Sign in</Button><Button className="hidden sm:inline-flex" onClick={() => { void navigate('/register'); }} size="sm">Get started</Button>
          <Button aria-expanded={open} aria-label="Toggle navigation menu" className="md:hidden" onClick={() => setOpen((value) => !value)} size="sm" variant="ghost">{open ? <X size={20} /> : <Menu size={20} />}</Button>
        </div>
      </div>
      {open ? <nav aria-label="Mobile public navigation" className="border-t border-slate-200 px-4 py-4 md:hidden dark:border-slate-800">{links.map((link) => <a className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-900" href={link.href} key={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}<div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => { setOpen(false); void navigate('/login'); }} variant="outline">Sign in</Button><Button onClick={() => { setOpen(false); void navigate('/register'); }}>Get started</Button></div></nav> : null}
    </header>
  );
}
