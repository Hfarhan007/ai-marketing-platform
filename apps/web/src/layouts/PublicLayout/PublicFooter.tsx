import { Sparkles } from 'lucide-react';

const groups = [
  { title: 'Product', links: ['Features', 'Integrations', 'Pricing'] },
  { title: 'Company', links: ['About', 'Careers', 'Contact'] },
  { title: 'Resources', links: ['Documentation', 'Guides', 'Status'] },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div><a className="inline-flex items-center gap-2 font-bold" href="/"><span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white"><Sparkles size={15} /></span>MarketFlow</a><p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">A polished foundation for modern teams and meaningful work.</p></div>
        {groups.map((group) => <nav aria-label={group.title} key={group.title}><h2 className="text-sm font-semibold">{group.title}</h2><ul className="mt-3 space-y-2">{group.links.map((link) => <li key={link}><a className="text-sm text-slate-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-white" href="/">{link}</a></li>)}</ul></nav>)}
      </div>
      <div className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500 dark:border-slate-800">© 2026 MarketFlow. All rights reserved.</div>
    </footer>
  );
}
