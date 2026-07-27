import { CheckCircle2, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

const benefits = ['One workspace for every team', 'Secure by design', 'Built to scale with you'] as const;

export function AuthSidebar({ illustration }: { illustration?: ReactNode }) {
  return (
    <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.35),transparent_45%)]" />
      <a className="relative flex items-center gap-3 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" href="/"><span className="grid size-10 place-items-center rounded-xl bg-indigo-500"><Sparkles size={20} /></span>MarketFlow</a>
      <div className="relative max-w-md"><p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">Secure collaboration</p><h2 className="mt-4 text-4xl font-bold leading-tight">Turn customer relationships into measurable growth.</h2>{illustration ? <div aria-hidden="true" className="mt-8">{illustration}</div> : null}<ul className="mt-8 space-y-4">{benefits.map((benefit) => <li className="flex items-center gap-3 text-slate-200" key={benefit}><CheckCircle2 className="text-indigo-400" size={19} />{benefit}</li>)}</ul></div>
      <p className="relative border-s-2 border-indigo-400 ps-4 text-sm text-slate-300">Encrypted sessions, role-based access, and privacy-conscious defaults.</p>
    </aside>
  );
}
